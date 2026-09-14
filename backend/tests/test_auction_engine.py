import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auction_engine import service
from app.database.database import Base
from app.models import AuctionItem, Bid, ItemStatus, Room, RoomMember, RoomRole, RoomStatus, Team, User
from app.schemas.room import PlaceBidRequest


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def make_room(db, *, status=RoomStatus.LIVE, purse=100, bid_increment=5):
    user = User(name="Auctioneer", email="auctioneer@example.com", hashed_password="x")
    db.add(user)
    db.flush()
    room = Room(
        room_code="ROOM01",
        name="Test Auction",
        created_by_id=user.id,
        status=status,
        purse_per_team=purse,
        bid_increment=bid_increment,
        timer_seconds=30,
        auto_extend_seconds=5,
        confirmation_seconds=1,
    )
    db.add(room)
    db.flush()
    return room, user


def make_item(db, room, *, base_price=10, status=ItemStatus.ACTIVE):
    item = AuctionItem(
        room_id=room.id,
        name="Test Player",
        base_price=base_price,
        status=status,
        sort_order=1,
    )
    db.add(item)
    db.flush()
    room.current_item_id = item.id
    db.commit()
    return item


def make_bidder(db, room, team, user_id=2):
    user = User(name=f"Bidder {user_id}", email=f"bidder{user_id}@example.com", hashed_password="x")
    db.add(user)
    db.flush()
    member = RoomMember(
        room_id=room.id,
        user_id=user.id,
        role=RoomRole.BIDDER,
        team_id=team.id,
        is_active=True,
    )
    db.add(member)
    db.commit()
    return user


@pytest.mark.parametrize("phase", ["bidding", "going_once", "going_twice"])
def test_remaining_from_deadline_never_goes_negative(phase):
    room = Room(timer_phase=phase, timer_remaining=7)
    room.timer_deadline = datetime.now(timezone.utc) - timedelta(seconds=2)
    assert service._remaining_from_deadline(room) == 0


def test_persist_timer_round_trips_timer_state(db):
    room, _ = make_room(db)
    deadline = datetime.now(timezone.utc) + timedelta(seconds=12)
    service._persist_timer(db, room.id, "going_once", 12, deadline)

    db.expire_all()
    saved = db.query(Room).filter(Room.id == room.id).one()
    assert saved.timer_phase == "going_once"
    assert saved.timer_remaining == 12
    assert saved.timer_deadline is not None


def test_resolve_sold_item_deducts_purse_and_clears_current_item(db, monkeypatch):
    room, _ = make_room(db, purse=100)
    item = make_item(db, room, base_price=10)
    team = Team(room_id=room.id, name="Team A", purse_total=100, purse_remaining=100)
    db.add(team)
    db.flush()
    bidder = make_bidder(db, room, team)
    db.add(Bid(room_id=room.id, item_id=item.id, team_id=team.id, user_id=bidder.id, amount=40))
    room.timer_phase = "going_twice"
    db.commit()

    async def fake_broadcast(*args, **kwargs):
        return None

    monkeypatch.setattr(service.ws_manager, "broadcast", fake_broadcast)
    asyncio.run(service._resolve_current_item(db, room.id))

    db.expire_all()
    saved_item = db.query(AuctionItem).filter(AuctionItem.id == item.id).one()
    saved_team = db.query(Team).filter(Team.id == team.id).one()
    saved_room = db.query(Room).filter(Room.id == room.id).one()

    assert saved_item.status == ItemStatus.SOLD
    assert saved_item.sold_price == 40
    assert saved_item.sold_to_team_id == team.id
    assert saved_team.purse_remaining == 60
    assert saved_team.purse_remaining >= 0
    assert saved_room.current_item_id is None


def test_resolve_unsold_item_does_not_change_purse(db, monkeypatch):
    room, _ = make_room(db, purse=100)
    item = make_item(db, room, base_price=10)
    room.timer_phase = "going_twice"
    db.commit()

    async def fake_broadcast(*args, **kwargs):
        return None

    monkeypatch.setattr(service.ws_manager, "broadcast", fake_broadcast)
    asyncio.run(service._resolve_current_item(db, room.id))

    db.expire_all()
    saved_item = db.query(AuctionItem).filter(AuctionItem.id == item.id).one()
    saved_room = db.query(Room).filter(Room.id == room.id).one()
    assert saved_item.status == ItemStatus.UNSOLD
    assert saved_item.sold_price is None
    assert saved_item.sold_to_team_id is None
    assert saved_room.current_item_id is None


def test_bid_must_follow_increment_and_team_purse(db, monkeypatch):
    room, _ = make_room(db, purse=50, bid_increment=5)
    item = make_item(db, room, base_price=10)
    team = Team(room_id=room.id, name="Team A", purse_total=50, purse_remaining=50)
    db.add(team)
    db.flush()
    bidder = make_bidder(db, room, team)
    db.add(Bid(room_id=room.id, item_id=item.id, team_id=team.id, user_id=bidder.id, amount=20))
    db.commit()

    async def fake_broadcast(*args, **kwargs):
        return None

    monkeypatch.setattr(service.ws_manager, "broadcast", fake_broadcast)

    with pytest.raises(ValueError, match="Minimum bid is 25"):
        asyncio.run(service.place_bid(db, room, bidder.id, PlaceBidRequest(amount=24)))

    with pytest.raises(ValueError, match="purse"):
        asyncio.run(service.place_bid(db, room, bidder.id, PlaceBidRequest(amount=51)))


def test_team_name_is_unique_within_room(db):
    room, _ = make_room(db)
    db.add(Team(room_id=room.id, name="Team A", purse_total=100, purse_remaining=100))
    db.commit()
    db.add(Team(room_id=room.id, name="Team A", purse_total=100, purse_remaining=100))

    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    assert db.query(Team).filter(Team.room_id == room.id, Team.name == "Team A").count() == 1

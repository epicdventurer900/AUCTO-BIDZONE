"""add unique team name constraint per room

Revision ID: 5c7d8e9f0a11
Revises: 4b6f7e8a9c10
"""
from typing import Sequence, Union

from alembic import op

revision: str = "5c7d8e9f0a11"
down_revision: Union[str, Sequence[str], None] = "4b6f7e8a9c10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint("uq_teams_room_name", "teams", ["room_id", "name"])


def downgrade() -> None:
    op.drop_constraint("uq_teams_room_name", "teams", type_="unique")

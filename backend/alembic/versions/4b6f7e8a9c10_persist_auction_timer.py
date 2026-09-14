"""persist auction timer state

Revision ID: 4b6f7e8a9c10
Revises: aa0a9cbe8fd6
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4b6f7e8a9c10"
down_revision: Union[str, Sequence[str], None] = "aa0a9cbe8fd6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("rooms", sa.Column("timer_phase", sa.String(length=30), nullable=False, server_default="idle"))
    op.add_column("rooms", sa.Column("timer_remaining", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("rooms", sa.Column("timer_deadline", sa.DateTime(timezone=True), nullable=True))
    op.alter_column("rooms", "timer_phase", server_default=None)
    op.alter_column("rooms", "timer_remaining", server_default=None)


def downgrade() -> None:
    op.drop_column("rooms", "timer_deadline")
    op.drop_column("rooms", "timer_remaining")
    op.drop_column("rooms", "timer_phase")

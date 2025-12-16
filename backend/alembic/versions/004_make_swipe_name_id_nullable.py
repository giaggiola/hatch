"""Make swipe name_id nullable for group swipes

Revision ID: 004
Revises: 003
Create Date: 2024-01-03

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite doesn't support ALTER COLUMN, so we use batch mode
    with op.batch_alter_table('swipes', schema=None) as batch_op:
        batch_op.alter_column('name_id',
                              existing_type=sa.String(36),
                              nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('swipes', schema=None) as batch_op:
        batch_op.alter_column('name_id',
                              existing_type=sa.String(36),
                              nullable=False)

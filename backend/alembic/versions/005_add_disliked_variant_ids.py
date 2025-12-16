"""Add disliked_variant_ids column to swipes

Revision ID: 005
Revises: 004
Create Date: 2024-12-14

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('swipes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('disliked_variant_ids', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('swipes', schema=None) as batch_op:
        batch_op.drop_column('disliked_variant_ids')

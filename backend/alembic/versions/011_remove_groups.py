"""Remove group-related columns from names table

Revision ID: 011
Revises: 010
Create Date: 2025-12-14

Groups feature has been removed in favor of embedding-based similarity.
This migration drops the unused group_id, is_primary, and phonetic_code columns.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '011'
down_revision: Union[str, None] = '010'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the name_groups_view if it exists
    op.execute("DROP VIEW IF EXISTS name_groups_view")

    # Drop indexes first (note: actual index name is ix_names_group_id)
    op.execute("DROP INDEX IF EXISTS ix_names_group_id")
    op.execute("DROP INDEX IF EXISTS idx_names_group_id")
    op.execute("DROP INDEX IF EXISTS idx_names_phonetic")

    # Drop the group-related columns from names table
    op.drop_column('names', 'group_id')
    op.drop_column('names', 'is_primary')
    op.drop_column('names', 'phonetic_code')


def downgrade() -> None:
    # Re-add the columns
    op.add_column('names', sa.Column('group_id', sa.String(36), nullable=True))
    op.add_column('names', sa.Column('is_primary', sa.Boolean(), server_default='0'))
    op.add_column('names', sa.Column('phonetic_code', sa.Text(), nullable=True))

    # Re-create indexes
    op.create_index('idx_names_group_id', 'names', ['group_id'])
    op.create_index('idx_names_phonetic', 'names', ['phonetic_code'])

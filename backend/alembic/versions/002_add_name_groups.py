"""Add name groups

Revision ID: 002
Revises: 001
Create Date: 2024-01-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add group_id to names table
    op.add_column('names', sa.Column('group_id', sa.String(36), nullable=True))
    op.add_column('names', sa.Column('is_primary', sa.Boolean(), server_default='0'))
    op.add_column('names', sa.Column('phonetic_code', sa.Text(), nullable=True))

    op.create_index('idx_names_group_id', 'names', ['group_id'])
    op.create_index('idx_names_phonetic', 'names', ['phonetic_code'])

    # Modify swipes to track liked variants (for group-based swiping)
    # When swiping on a group, user can select specific variants they like
    op.add_column('swipes', sa.Column('liked_variant_ids', sa.Text(), nullable=True))  # JSON array of name IDs

    # Add group_id to swipes - swipe is now per group, not per individual name
    op.add_column('swipes', sa.Column('group_id', sa.String(36), nullable=True))


def downgrade() -> None:
    op.drop_column('swipes', 'group_id')
    op.drop_column('swipes', 'liked_variant_ids')
    op.drop_index('idx_names_phonetic', 'names')
    op.drop_index('idx_names_group_id', 'names')
    op.drop_column('names', 'phonetic_code')
    op.drop_column('names', 'is_primary')
    op.drop_column('names', 'group_id')

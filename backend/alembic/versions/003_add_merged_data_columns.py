"""Add merged data columns

Revision ID: 003
Revises: 002
Create Date: 2024-01-03

Adds columns to support merged international names dataset:
- country: ISO 3166-1 alpha-2 country code
- weighted_count: Half-life weighted popularity score
- total_count: Raw total count across all years
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add country column for ISO codes (distinct from origin which is cultural/meaning based)
    op.add_column('names', sa.Column('country', sa.String(2), nullable=True))

    # Add weighted_count for half-life weighted popularity
    op.add_column('names', sa.Column('weighted_count', sa.Float(), nullable=True))

    # Add total_count for raw historical totals
    op.add_column('names', sa.Column('total_count', sa.Integer(), nullable=True))

    # Add index on country for filtering by country
    op.create_index('idx_names_country', 'names', ['country'])

    # Add composite index for (name, country) lookups
    op.create_index('idx_names_name_country', 'names', ['name', 'country'])

    # Add index on weighted_count for popularity sorting
    op.create_index('idx_names_weighted_count', 'names', ['weighted_count'])


def downgrade() -> None:
    op.drop_index('idx_names_weighted_count', 'names')
    op.drop_index('idx_names_name_country', 'names')
    op.drop_index('idx_names_country', 'names')
    op.drop_column('names', 'total_count')
    op.drop_column('names', 'weighted_count')
    op.drop_column('names', 'country')

"""Add performance indexes for faster queries

Revision ID: 013
Revises: 012
Create Date: 2024-12-15

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Index for name text search (autocomplete/search)
    op.create_index('idx_names_name', 'names', ['name'])

    # Index for user couple lookups
    op.create_index('idx_users_couple_id', 'users', ['couple_id'])

    # Index for popularity rank ordering
    op.create_index('idx_popularity_rank', 'name_popularity', ['popularity_rank'])

    # Composite index for swipe lookups by user
    op.create_index('idx_swipes_user_name', 'swipes', ['user_id', 'name_id'])


def downgrade() -> None:
    op.drop_index('idx_swipes_user_name', table_name='swipes')
    op.drop_index('idx_popularity_rank', table_name='name_popularity')
    op.drop_index('idx_users_couple_id', table_name='users')
    op.drop_index('idx_names_name', table_name='names')

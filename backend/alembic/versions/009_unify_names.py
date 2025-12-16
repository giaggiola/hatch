"""Unify names: one row per (name, gender), separate popularity table

Revision ID: 009
Revises: 008
Create Date: 2025-12-14

This migration:
1. Drops origin, country, popularity_rank, weighted_count, total_count from names
2. Creates name_popularity table for per-country stats
3. Adds unique constraint on (name, gender)
4. Clears all data (clean slate for new import)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '009'
down_revision: Union[str, None] = '008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Clear existing data
    conn.execute(sa.text("DELETE FROM swipes"))
    conn.execute(sa.text("DELETE FROM names"))

    # Drop all indexes on names table that reference columns we're removing
    result = conn.execute(sa.text("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='names'"))
    indexes = [row[0] for row in result.fetchall()]
    for idx in indexes:
        if idx and not idx.startswith('sqlite_'):
            try:
                conn.execute(sa.text(f"DROP INDEX IF EXISTS \"{idx}\""))
            except Exception:
                pass

    # Recreate names table using raw SQL (simpler than batch mode)
    # 1. Create new table with desired schema
    conn.execute(sa.text("""
        CREATE TABLE names_new (
            id VARCHAR(36) PRIMARY KEY,
            name TEXT NOT NULL,
            gender TEXT,
            meaning TEXT,
            length INTEGER,
            group_id VARCHAR(36),
            is_primary BOOLEAN DEFAULT 0,
            phonetic_code TEXT,
            CONSTRAINT check_gender CHECK (gender IN ('M', 'F', 'U')),
            CONSTRAINT unique_name_gender UNIQUE (name, gender)
        )
    """))

    # 2. Drop old table
    conn.execute(sa.text("DROP TABLE names"))

    # 3. Rename new table
    conn.execute(sa.text("ALTER TABLE names_new RENAME TO names"))

    # 4. Recreate group_id index
    conn.execute(sa.text("CREATE INDEX ix_names_group_id ON names (group_id)"))

    # Now create name_popularity table (after names exists for FK)
    op.create_table(
        'name_popularity',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name_id', sa.String(36), sa.ForeignKey('names.id', ondelete='CASCADE'), nullable=False),
        sa.Column('country_code', sa.String(2), nullable=False),
        sa.Column('popularity_rank', sa.Integer(), nullable=True),
        sa.Column('weighted_count', sa.Float(), nullable=True),
        sa.Column('total_count', sa.Integer(), nullable=True),
        sa.UniqueConstraint('name_id', 'country_code', name='unique_name_country'),
    )
    op.create_index('ix_name_popularity_name_id', 'name_popularity', ['name_id'])
    op.create_index('ix_name_popularity_country_code', 'name_popularity', ['country_code'])
    op.create_index('idx_popularity_country_weight', 'name_popularity', ['country_code', 'weighted_count'])


def downgrade() -> None:
    # Drop name_popularity table
    op.drop_table('name_popularity')

    # Re-add columns to names (data will be lost)
    with op.batch_alter_table('names', schema=None) as batch_op:
        batch_op.add_column(sa.Column('origin', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('country', sa.String(2), nullable=True))
        batch_op.add_column(sa.Column('popularity_rank', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('weighted_count', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('total_count', sa.Integer(), nullable=True))

    # Recreate country index
    op.create_index('ix_names_country', 'names', ['country'])

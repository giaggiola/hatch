"""Add name_similarities table for pre-computed similar names

Revision ID: 014
Revises: 013
Create Date: 2025-12-16

Stores pre-computed similar names to avoid on-the-fly cosine similarity computation.
Each name has up to 20 similar names with their similarity scores.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '014'
down_revision: Union[str, None] = '013'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'name_similarities',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name_id', sa.String(36), sa.ForeignKey('names.id', ondelete='CASCADE'), nullable=False),
        sa.Column('similar_name_id', sa.String(36), sa.ForeignKey('names.id', ondelete='CASCADE'), nullable=False),
        sa.Column('similarity', sa.Float(), nullable=False),
        sa.Column('rank', sa.Integer(), nullable=False),  # 1-20, ordered by similarity
        # Unique constraint included in table creation for SQLite compatibility
        sa.UniqueConstraint('name_id', 'similar_name_id', name='uq_name_similarities'),
    )
    # Index for fast lookup by name_id
    op.create_index('ix_name_similarities_name_id', 'name_similarities', ['name_id'])
    # Composite index for efficient queries
    op.create_index('ix_name_similarities_name_rank', 'name_similarities', ['name_id', 'rank'])


def downgrade() -> None:
    op.drop_index('ix_name_similarities_name_rank', table_name='name_similarities')
    op.drop_index('ix_name_similarities_name_id', table_name='name_similarities')
    op.drop_table('name_similarities')

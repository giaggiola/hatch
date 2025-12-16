"""Add name_facts table for enriched name data

Revision ID: 010
Revises: 009
Create Date: 2025-12-14

Stores enriched name data from Gemini API:
- origin_language: linguistic/etymological origin
- meaning: name meaning (backfills names.meaning)
- nicknames: common diminutives
- historical_figures: notable real people
- fictional_characters: notable fictional characters
- cultural_references: religious, mythological, literary significance
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '010'
down_revision: Union[str, None] = '2def2fd57eda'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'name_facts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name_id', sa.String(36), sa.ForeignKey('names.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('origin_language', sa.Text(), nullable=True),
        sa.Column('meaning', sa.Text(), nullable=True),
        sa.Column('nicknames', sa.Text(), nullable=True),  # JSON array
        sa.Column('historical_figures', sa.Text(), nullable=True),  # JSON array
        sa.Column('fictional_characters', sa.Text(), nullable=True),  # JSON array
        sa.Column('cultural_references', sa.Text(), nullable=True),  # JSON object
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_name_facts_name_id', 'name_facts', ['name_id'])


def downgrade() -> None:
    op.drop_index('ix_name_facts_name_id', table_name='name_facts')
    op.drop_table('name_facts')

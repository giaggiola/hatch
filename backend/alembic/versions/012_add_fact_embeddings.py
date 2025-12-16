"""Add embedding columns to name_facts

Revision ID: 012
Revises: 011
Create Date: 2025-12-15

Adds three embedding columns for multi-aspect similarity:
- embedding_phonetic: name + nicknames (sound similarity)
- embedding_etymology: meaning + origin (semantic similarity)
- embedding_associations: historical + fictional + cultural (vibe similarity)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '012'
down_revision: Union[str, None] = '011'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('name_facts', sa.Column('embedding_phonetic', sa.Text(), nullable=True))
    op.add_column('name_facts', sa.Column('embedding_etymology', sa.Text(), nullable=True))
    op.add_column('name_facts', sa.Column('embedding_associations', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('name_facts', 'embedding_associations')
    op.drop_column('name_facts', 'embedding_etymology')
    op.drop_column('name_facts', 'embedding_phonetic')

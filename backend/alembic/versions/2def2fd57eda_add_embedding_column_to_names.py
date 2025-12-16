"""add_embedding_column_to_names

Revision ID: 2def2fd57eda
Revises: 009
Create Date: 2025-12-14 22:03:37.737510

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2def2fd57eda'
down_revision: Union[str, None] = '009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('names', sa.Column('embedding', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('names', 'embedding')

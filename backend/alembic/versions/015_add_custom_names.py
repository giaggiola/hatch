"""Add custom_names table for user-submitted names

Revision ID: 015
Revises: 014
Create Date: 2025-12-17

Allows users to add custom names that don't exist in the database.
These can be swiped on like regular names.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '015'
down_revision: Union[str, None] = '014'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'custom_names',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('couple_id', sa.String(36), sa.ForeignKey('couples.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('gender', sa.Text(), nullable=False, server_default='U'),
        sa.Column('created_at', sa.Text(), server_default="(datetime('now'))"),
        sa.CheckConstraint("gender IN ('M', 'F', 'U')", name='check_custom_name_gender'),
    )
    # Index for fast lookup by couple_id
    op.create_index('ix_custom_names_couple_id', 'custom_names', ['couple_id'])
    # Index for fast lookup by user_id
    op.create_index('ix_custom_names_user_id', 'custom_names', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_custom_names_user_id', table_name='custom_names')
    op.drop_index('ix_custom_names_couple_id', table_name='custom_names')
    op.drop_table('custom_names')

"""Initial migration

Revision ID: 001
Revises:
Create Date: 2024-01-01

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Couples table
    op.create_table(
        'couples',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.Text(), server_default="(datetime('now'))"),
    )

    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('google_id', sa.Text(), nullable=False, unique=True),
        sa.Column('email', sa.Text(), nullable=False, unique=True),
        sa.Column('display_name', sa.Text(), nullable=True),
        sa.Column('family_name', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('couple_id', sa.String(36), sa.ForeignKey('couples.id'), nullable=True),
        sa.Column('created_at', sa.Text(), server_default="(datetime('now'))"),
        sa.Column('updated_at', sa.Text(), server_default="(datetime('now'))"),
    )

    # Note: couples.created_by FK to users.id is handled at app level
    # SQLite doesn't support adding FK constraints after table creation

    # User preferences table
    op.create_table(
        'user_preferences',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('origins', sa.Text(), server_default='[]'),
        sa.Column('genders', sa.Text(), server_default='[]'),
        sa.Column('starting_letters', sa.Text(), server_default='[]'),
        sa.Column('max_length', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.Text(), server_default="(datetime('now'))"),
    )

    # Invites table
    op.create_table(
        'invites',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('code', sa.Text(), nullable=False, unique=True),
        sa.Column('couple_id', sa.String(36), sa.ForeignKey('couples.id'), nullable=False),
        sa.Column('invited_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('invited_email', sa.Text(), nullable=True),
        sa.Column('status', sa.Text(), server_default='pending'),
        sa.Column('expires_at', sa.Text(), nullable=True),
        sa.Column('created_at', sa.Text(), server_default="(datetime('now'))"),
    )

    # Names table
    op.create_table(
        'names',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('gender', sa.Text(), nullable=True),
        sa.Column('origin', sa.Text(), nullable=False),
        sa.Column('meaning', sa.Text(), nullable=True),
        sa.Column('popularity_rank', sa.Integer(), nullable=True),
        sa.Column('length', sa.Integer(), nullable=True),
        sa.CheckConstraint("gender IN ('M', 'F', 'U')", name='check_gender'),
    )
    op.create_index('idx_names_origin', 'names', ['origin'])
    op.create_index('idx_names_gender', 'names', ['gender'])
    op.create_index('idx_names_length', 'names', ['length'])

    # Swipes table
    op.create_table(
        'swipes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('name_id', sa.String(36), sa.ForeignKey('names.id'), nullable=False),
        sa.Column('couple_id', sa.String(36), sa.ForeignKey('couples.id'), nullable=False),
        sa.Column('action', sa.Text(), nullable=False),
        sa.Column('created_at', sa.Text(), server_default="(datetime('now'))"),
        sa.Column('updated_at', sa.Text(), server_default="(datetime('now'))"),
        sa.UniqueConstraint('user_id', 'name_id', name='unique_user_name_swipe'),
        sa.CheckConstraint("action IN ('like', 'dismiss')", name='check_action'),
    )
    op.create_index('idx_swipes_couple_name', 'swipes', ['couple_id', 'name_id'])
    op.create_index('idx_swipes_user_action', 'swipes', ['user_id', 'action'])


def downgrade() -> None:
    op.drop_table('swipes')
    op.drop_table('names')
    op.drop_table('invites')
    op.drop_table('user_preferences')
    op.drop_table('users')
    op.drop_table('couples')

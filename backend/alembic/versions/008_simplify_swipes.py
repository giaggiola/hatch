"""Simplify swipes to one row per name_id

Revision ID: 008
Revises: 7ab292be6060
Create Date: 2025-12-14

This migration:
1. Expands group swipes into individual name swipes
2. Removes group-related columns (group_id, swipe_gender, liked_variant_ids, disliked_variant_ids)
3. Makes name_id NOT NULL
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import json
import uuid


revision: str = '008'
down_revision: Union[str, None] = '7ab292be6060'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Step 1: Expand group swipes into individual swipes
    # Get all group swipes (where group_id is not null)
    group_swipes = conn.execute(sa.text("""
        SELECT id, user_id, couple_id, group_id, action, liked_variant_ids, disliked_variant_ids, created_at, updated_at
        FROM swipes
        WHERE group_id IS NOT NULL
    """)).fetchall()

    for swipe in group_swipes:
        swipe_id, user_id, couple_id, group_id, action, liked_json, disliked_json, created_at, updated_at = swipe

        # Parse JSON arrays
        liked_ids = json.loads(liked_json) if liked_json else []
        disliked_ids = json.loads(disliked_json) if disliked_json else []

        # Create individual swipes for liked variants
        for name_id in liked_ids:
            # Check if individual swipe already exists (avoid duplicates)
            existing = conn.execute(sa.text("""
                SELECT 1 FROM swipes WHERE user_id = :user_id AND name_id = :name_id
            """), {"user_id": user_id, "name_id": name_id}).fetchone()

            if not existing:
                new_id = str(uuid.uuid4())
                conn.execute(sa.text("""
                    INSERT INTO swipes (id, user_id, name_id, couple_id, action, created_at, updated_at)
                    VALUES (:id, :user_id, :name_id, :couple_id, 'like', :created_at, :updated_at)
                """), {
                    "id": new_id,
                    "user_id": user_id,
                    "name_id": name_id,
                    "couple_id": couple_id,
                    "created_at": created_at,
                    "updated_at": updated_at,
                })

        # Create individual swipes for disliked variants
        for name_id in disliked_ids:
            # Check if individual swipe already exists
            existing = conn.execute(sa.text("""
                SELECT 1 FROM swipes WHERE user_id = :user_id AND name_id = :name_id
            """), {"user_id": user_id, "name_id": name_id}).fetchone()

            if not existing:
                new_id = str(uuid.uuid4())
                conn.execute(sa.text("""
                    INSERT INTO swipes (id, user_id, name_id, couple_id, action, created_at, updated_at)
                    VALUES (:id, :user_id, :name_id, :couple_id, 'dismiss', :created_at, :updated_at)
                """), {
                    "id": new_id,
                    "user_id": user_id,
                    "name_id": name_id,
                    "couple_id": couple_id,
                    "created_at": created_at,
                    "updated_at": updated_at,
                })

        # Delete the original group swipe
        conn.execute(sa.text("""
            DELETE FROM swipes WHERE id = :id
        """), {"id": swipe_id})

    # Step 2: Remove orphan swipes (where name_id is still NULL after expansion)
    conn.execute(sa.text("""
        DELETE FROM swipes WHERE name_id IS NULL
    """))

    # Step 3: Drop group-related columns
    # SQLite doesn't support DROP COLUMN directly, need to recreate table
    # Using batch_alter_table for SQLite compatibility
    with op.batch_alter_table('swipes', schema=None) as batch_op:
        batch_op.drop_column('group_id')
        batch_op.drop_column('swipe_gender')
        batch_op.drop_column('liked_variant_ids')
        batch_op.drop_column('disliked_variant_ids')

        # Make name_id NOT NULL
        batch_op.alter_column('name_id', nullable=False)


def downgrade() -> None:
    # Re-add group columns (data cannot be restored)
    with op.batch_alter_table('swipes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('group_id', sa.String(36), nullable=True))
        batch_op.add_column(sa.Column('swipe_gender', sa.String(1), nullable=True))
        batch_op.add_column(sa.Column('liked_variant_ids', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('disliked_variant_ids', sa.Text(), nullable=True))
        batch_op.alter_column('name_id', nullable=True)

    # Create index on group_id
    op.create_index('ix_swipes_group_id', 'swipes', ['group_id'])

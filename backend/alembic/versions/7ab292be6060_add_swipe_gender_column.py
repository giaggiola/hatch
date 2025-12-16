"""add_swipe_gender_column

Revision ID: 7ab292be6060
Revises: 005
Create Date: 2025-12-14 16:30:43.999544

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7ab292be6060'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add swipe_gender column
    op.add_column('swipes', sa.Column('swipe_gender', sa.String(1), nullable=True))

    # Backfill existing group swipes with gender from their liked variants
    # For swipes with liked_variant_ids, get gender from the first liked name
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE swipes
        SET swipe_gender = (
            SELECT n.gender
            FROM names n
            WHERE n.id = (
                SELECT json_extract(swipes.liked_variant_ids, '$[0]')
            )
        )
        WHERE group_id IS NOT NULL
        AND liked_variant_ids IS NOT NULL
        AND swipe_gender IS NULL
    """))

    # For dismissed groups (no liked variants), get gender from the most popular name in the group
    conn.execute(sa.text("""
        UPDATE swipes
        SET swipe_gender = (
            SELECT n.gender
            FROM names n
            WHERE n.group_id = swipes.group_id
            ORDER BY n.weighted_count DESC NULLS LAST
            LIMIT 1
        )
        WHERE group_id IS NOT NULL
        AND (liked_variant_ids IS NULL OR liked_variant_ids = '[]')
        AND swipe_gender IS NULL
    """))


def downgrade() -> None:
    op.drop_column('swipes', 'swipe_gender')

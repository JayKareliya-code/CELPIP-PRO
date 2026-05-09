"""Add mock_bundle to addon_credit check_addon_credit_type constraint.

Revision ID: 0018_mock_bundle
Revises: 0017_addon_credits
Create Date: 2026-05-09
"""
from typing import Sequence, Union

from alembic import op

revision:      str                             = "0018_mock_bundle"
down_revision: Union[str, Sequence[str], None] = "0017_addon_credits"
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Expand the addon_type CHECK constraint to include 'mock_bundle'.
    op.drop_constraint("check_addon_credit_type", "addon_credits", type_="check")
    op.create_check_constraint(
        "check_addon_credit_type",
        "addon_credits",
        "addon_type IN ('writing_pack', 'speaking_pack', 'custom_bundle', 'mock_bundle')",
    )


def downgrade() -> None:
    # Note: any existing mock_bundle rows would violate the narrower constraint —
    # remove them manually before running downgrade if needed.
    op.drop_constraint("check_addon_credit_type", "addon_credits", type_="check")
    op.create_check_constraint(
        "check_addon_credit_type",
        "addon_credits",
        "addon_type IN ('writing_pack', 'speaking_pack', 'custom_bundle')",
    )

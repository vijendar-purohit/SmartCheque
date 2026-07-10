"""increase default wallet balance to 10 lakh

Revision ID: a1b2c3d4e5f6
Revises: 8baedd88c5ff
Create Date: 2026-06-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '8baedd88c5ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Backfill: existing accounts/users with the old Rs.1,00,000 default
    # (10000000 paise) get bumped to the new Rs.10,00,000 default
    # (100000000 paise). This avoids wiping out accounts that have
    # already been debited through real transactions.
    op.execute("UPDATE accounts SET balance_paise = 100000000 WHERE balance_paise = 10000000")
    op.execute("UPDATE users SET wallet_paise = 100000000 WHERE wallet_paise = 10000000")


def downgrade() -> None:
    op.execute("UPDATE accounts SET balance_paise = 10000000 WHERE balance_paise = 100000000")
    op.execute("UPDATE users SET wallet_paise = 10000000 WHERE wallet_paise = 100000000")

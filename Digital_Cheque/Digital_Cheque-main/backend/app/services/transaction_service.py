from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from app.models import Account, Transaction, Cheque, ChequeLeaf
import datetime


async def transfer_funds(db: AsyncSession, cheque: Cheque, payee_account_id: str) -> dict:
    """
    Atomic transfer with FOR UPDATE lock on drawer and payee accounts.
    """
    # Lock drawer account
    drawer_result = await db.execute(
        select(Account).where(Account.id == cheque.drawer_account_id).with_for_update()
    )
    drawer = drawer_result.scalars().first()
    if not drawer:
        raise ValueError("Drawer account not found")

    # Lock payee account
    payee_result = await db.execute(
        select(Account).where(Account.id == payee_account_id).with_for_update()
    )
    payee = payee_result.scalars().first()
    if not payee:
        raise ValueError("Payee account not found")

    # Check balance
    if drawer.balance_paise < cheque.amount_paise:
        raise ValueError("Insufficient balance")

    # Update balances
    drawer.balance_paise -= cheque.amount_paise
    payee.balance_paise += cheque.amount_paise

    # Create transaction record
    transaction = Transaction(
        cheque_id=cheque.id,
        drawer_account_id=drawer.id,
        payee_account_id=payee.id,
        amount_paise=cheque.amount_paise,
        status="SETTLED",
        settled_at=datetime.datetime.now(),
    )
    db.add(transaction)

    # Update cheque status
    cheque.status = "CLEARED"

    # Update leaf status
    leaf_result = await db.execute(
        select(ChequeLeaf).where(ChequeLeaf.leaf_serial == cheque.leaf_serial)
    )
    leaf = leaf_result.scalars().first()
    if leaf:
        leaf.status = "USED"
        leaf.cleared_at = datetime.datetime.now()

    await db.commit()

    return {
        "transaction_id": str(transaction.id),
        "drawer_new_balance_paise": drawer.balance_paise,
        "payee_new_balance_paise": payee.balance_paise,
        "settled_at": transaction.settled_at.isoformat(),
    }
const prisma = require('../config/prisma')


const createLedgerEntry = async (tx, {
  walletId,
  exchangeId = null,
  movementType,
  amount,
  availableBefore,
  availableAfter,
  heldBefore,
  heldAfter,
  balanceBefore,
  balanceAfter,
  status = 'CONFIRMED'
}) => {
  return tx.ledger_entries.create({
    data: {
      wallet_id: BigInt(walletId),
      exchange_id: exchangeId,
      movement_type: movementType,
      amount,
      available_before: availableBefore,
      available_after: availableAfter,
      held_before: heldBefore,
      held_after: heldAfter,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      status
    }
  })
}


const getLedgerEntryById = async (id) => {
  return prisma.ledger_entries.findUnique({
    where: {
      id: BigInt(id)
    }
  })
}


const getLedgerByWallet = async (walletId) => {
  return prisma.ledger_entries.findMany({
    where: {
      wallet_id: BigInt(walletId)
    },
    orderBy: {
      created_at: 'desc'
    }
  })
}


const getLedgerByExchange = async (exchangeId) => {
  return prisma.ledger_entries.findMany({
    where: {
      exchange_id: exchangeId
    },
    orderBy: {
      created_at: 'asc'
    }
  })
}


const getLedger = async () => {
  return prisma.ledger_entries.findMany({
    include: {
      wallets: true,
      exchanges: true
    },
    orderBy: {
      created_at: 'desc'
    }
  })
}


module.exports = {
  createLedgerEntry,
  getLedgerEntryById,
  getLedgerByWallet,
  getLedgerByExchange,
  getLedger
}
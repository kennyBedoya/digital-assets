const prisma = require('../config/prisma')


const createWallet = async ({ userId, assetId }) => {
  return prisma.wallets.create({
    data: {
      user_id: BigInt(userId),
      asset_id: BigInt(assetId)
    }
  })
}


const getWalletById = async (id) => {
  return prisma.wallets.findUnique({
    where: {
      id: BigInt(id)
    }
  })
}


const getWalletByUserAndAsset = async (userId, assetId) => {
  return prisma.wallets.findUnique({
    where: {
      user_id_asset_id: {
        user_id: BigInt(userId),
        asset_id: BigInt(assetId)
      }
    }
  })
}


const getWalletsByUser = async (userId) => {
  return prisma.wallets.findMany({
    where: {
      user_id: BigInt(userId)
    },
    include: {
      assets: true
    },
    orderBy: {
      id: 'asc'
    }
  })
}


const getWallets = async () => {
  return prisma.wallets.findMany({
    include: {
      assets: true,
      users: true
    },
    orderBy: {
      id: 'asc'
    }
  })
}


/**
 * Locks a wallet inside a transaction.
 *
 * The transaction receives the Prisma transaction client (`tx`)
 * from the caller. PostgreSQL row-level locking is used so
 * concurrent operations cannot consume the same balance.
 */
const lockWallet = async (tx, walletId) => {
  const rows = await tx.$queryRaw`
    SELECT *
    FROM wallets
    WHERE id = ${BigInt(walletId)}
    FOR UPDATE
  `

  if (rows.length === 0) {
    throw new Error('Wallet not found')
  }

  return rows[0]
}


/**
 * Moves funds from available balance to held balance.
 *
 * This operation must be executed inside an existing Prisma
 * transaction.
 */
const holdBalance = async (tx, {
  walletId,
  amount
}) => {
  const wallet = await lockWallet(tx, walletId)

  const available = Number(wallet.available_balance)
  const held = Number(wallet.held_balance)
  const value = Number(amount)

  if (value <= 0) {
    throw new Error('Amount must be greater than zero')
  }

  if (available < value) {
    throw new Error('Insufficient available balance')
  }

  const updatedWallet = await tx.wallets.update({
    where: {
      id: BigInt(walletId)
    },
    data: {
      available_balance: available - value,
      held_balance: held + value,
      updated_at: new Date()
    }
  })

  return {
    wallet: updatedWallet,
    availableBefore: available,
    availableAfter: available - value,
    heldBefore: held,
    heldAfter: held + value
  }
}


/**
 * Releases held funds back to available balance.
 *
 * Must be executed inside an existing Prisma transaction.
 */
const releaseHeldBalance = async (tx, {
  walletId,
  amount
}) => {
  const wallet = await lockWallet(tx, walletId)

  const available = Number(wallet.available_balance)
  const held = Number(wallet.held_balance)
  const value = Number(amount)

  if (value <= 0) {
    throw new Error('Amount must be greater than zero')
  }

  if (held < value) {
    throw new Error('Insufficient held balance')
  }

  const updatedWallet = await tx.wallets.update({
    where: {
      id: BigInt(walletId)
    },
    data: {
      available_balance: available + value,
      held_balance: held - value,
      updated_at: new Date()
    }
  })

  return {
    wallet: updatedWallet,
    availableBefore: available,
    availableAfter: available + value,
    heldBefore: held,
    heldAfter: held - value
  }
}


module.exports = {
  createWallet,
  getWalletById,
  getWalletByUserAndAsset,
  getWalletsByUser,
  getWallets,
  lockWallet,
  holdBalance,
  releaseHeldBalance
}
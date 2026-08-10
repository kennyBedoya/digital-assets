const crypto = require('crypto')
const prisma = require('../config/prisma')

const createExchange = async ({
  id,
  userId,
  quoteId,
  sourceAssetId,
  targetAssetId,
  sourceAmount,
  price,
  fee,
  targetAmount,
  riskLevel,
  requiresFollowUp,
  idempotencyKey,
  requestHash,
  expiresAt
}) => {
  if (!idempotencyKey) {
    throw new Error('Idempotency key is required')
  }

  if (!['LOW', 'MEDIUM', 'HIGH'].includes(riskLevel)) {
    throw new Error('Invalid risk level')
  }

  const calculatedRequestHash =
    requestHash ||
    crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          userId,
          quoteId,
          sourceAssetId,
          targetAssetId,
          sourceAmount,
          price,
          fee,
          targetAmount,
          riskLevel,
          expiresAt
        })
      )
      .digest('hex')

  // --------------------------------------------------
  // IDEMPOTENCY
  // --------------------------------------------------

  const existingExchange = await prisma.exchanges.findUnique({
    where: {
      idempotency_key: idempotencyKey
    }
  })

  if (existingExchange) {
    if (existingExchange.request_hash !== calculatedRequestHash) {
      throw new Error(
        'Idempotency key already used with different content'
      )
    }

    return existingExchange
  }

  // --------------------------------------------------
  // TRANSACTION
  // --------------------------------------------------

  return prisma.$transaction(async (tx) => {
    // ------------------------------------------------
    // VALIDATE QUOTE
    // ------------------------------------------------

    const quote = await tx.quotes.findUnique({
      where: {
        id: quoteId
      }
    })

    if (!quote) {
      throw new Error('Quote not found')
    }

    if (quote.user_id !== BigInt(userId)) {
      throw new Error('Quote does not belong to user')
    }

    if (quote.status !== 'ACTIVE') {
      throw new Error('Quote is not active')
    }

    if (new Date() >= quote.expires_at) {
      await tx.quotes.update({
        where: {
          id: quoteId
        },
        data: {
          status: 'EXPIRED'
        }
      })

      throw new Error('Quote has expired')
    }

    // ------------------------------------------------
    // VALIDATE QUOTE VALUES
    // ------------------------------------------------

    if (
      BigInt(sourceAssetId) !== quote.source_asset_id ||
      BigInt(targetAssetId) !== quote.target_asset_id
    ) {
      throw new Error('Exchange assets do not match quote')
    }

    if (Number(sourceAmount) !== Number(quote.source_amount)) {
      throw new Error('Source amount does not match quote')
    }

    // ------------------------------------------------
    // SOURCE WALLET
    // ------------------------------------------------

    const sourceWalletRows = await tx.$queryRaw`
      SELECT *
      FROM wallets
      WHERE user_id = ${BigInt(userId)}
        AND asset_id = ${BigInt(sourceAssetId)}
      FOR UPDATE
    `

    const sourceWallet = sourceWalletRows[0]

    if (!sourceWallet) {
      throw new Error('Source wallet not found')
    }

    // ------------------------------------------------
    // CHECK BALANCE
    // ------------------------------------------------

    const available = Number(sourceWallet.available_balance)
    const held = Number(sourceWallet.held_balance)
    const amount = Number(sourceAmount)

    if (amount <= 0) {
      throw new Error('Amount must be greater than zero')
    }

    if (available < amount) {
      throw new Error('Insufficient available balance')
    }

    // ------------------------------------------------
    // HOLD BALANCE
    // ------------------------------------------------

    const newAvailable = available - amount
    const newHeld = held + amount

    const updatedSourceWallet = await tx.wallets.update({
      where: {
        id: BigInt(sourceWallet.id)
      },
      data: {
        available_balance: newAvailable,
        held_balance: newHeld,
        updated_at: new Date()
      }
    })

    // ------------------------------------------------
    // DETERMINE STATUS
    // ------------------------------------------------

    const status =
      riskLevel === 'HIGH'
        ? 'PENDING_REVIEW'
        : 'COMPLETED'

    const followUp =
      riskLevel === 'MEDIUM'
        ? true
        : Boolean(requiresFollowUp)

    // ------------------------------------------------
    // CREATE EXCHANGE
    // ------------------------------------------------

    const exchange = await tx.exchanges.create({
      data: {
        id: id || crypto.randomUUID(),
        user_id: BigInt(userId),
        quote_id: quoteId,
        source_asset_id: BigInt(sourceAssetId),
        target_asset_id: BigInt(targetAssetId),
        source_amount: sourceAmount,
        price,
        fee,
        target_amount: targetAmount,
        risk_level: riskLevel,
        requires_follow_up: followUp,
        status,
        idempotency_key: idempotencyKey,
        request_hash: calculatedRequestHash,
        expires_at: expiresAt || quote.expires_at
      }
    })

    // ------------------------------------------------
    // LEDGER - HOLD
    // ------------------------------------------------

    await tx.ledger_entries.create({
      data: {
        wallet_id: BigInt(updatedSourceWallet.id),
        exchange_id: exchange.id,
        movement_type: 'HOLD',
        amount,
        available_before: available,
        available_after: newAvailable,
        held_before: held,
        held_after: newHeld,
        balance_before: available + held,
        balance_after: newAvailable + newHeld,
        status: 'CONFIRMED'
      }
    })

    // ------------------------------------------------
    // HIGH RISK
    // ------------------------------------------------

    if (riskLevel === 'HIGH') {
      await tx.compliance_decisions.create({
        data: {
          exchange_id: exchange.id,
          risk_level: 'HIGH',
          reason: 'High risk exchange requires compliance review'
        }
      })

      return exchange
    }

    // ------------------------------------------------
    // TARGET WALLET
    // ------------------------------------------------

    const targetWalletRows = await tx.$queryRaw`
      SELECT *
      FROM wallets
      WHERE user_id = ${BigInt(userId)}
        AND asset_id = ${BigInt(targetAssetId)}
      FOR UPDATE
    `

    const targetWallet = targetWalletRows[0]

    if (!targetWallet) {
      throw new Error('Target wallet not found')
    }

    const targetAvailable =
      Number(targetWallet.available_balance)

    const targetHeld =
      Number(targetWallet.held_balance)

    const targetValue =
      Number(targetAmount)

    // ------------------------------------------------
    // CONSUME SOURCE HOLD
    // ------------------------------------------------

    await tx.wallets.update({
      where: {
        id: BigInt(sourceWallet.id)
      },
      data: {
        held_balance: newHeld - amount,
        updated_at: new Date()
      }
    })

    await tx.ledger_entries.create({
      data: {
        wallet_id: BigInt(sourceWallet.id),
        exchange_id: exchange.id,
        movement_type: 'SETTLEMENT',
        amount: -amount,
        available_before: newAvailable,
        available_after: newAvailable,
        held_before: newHeld,
        held_after: newHeld - amount,
        balance_before: available + held,
        balance_after: available + held - amount,
        status: 'CONFIRMED'
      }
    })

    // ------------------------------------------------
    // CREDIT TARGET WALLET
    // ------------------------------------------------

    await tx.wallets.update({
      where: {
        id: BigInt(targetWallet.id)
      },
      data: {
        available_balance:
          targetAvailable + targetValue,
        updated_at: new Date()
      }
    })

    await tx.ledger_entries.create({
      data: {
        wallet_id: BigInt(targetWallet.id),
        exchange_id: exchange.id,
        movement_type: 'SETTLEMENT',
        amount: targetValue,
        available_before: targetAvailable,
        available_after:
          targetAvailable + targetValue,
        held_before: targetHeld,
        held_after: targetHeld,
        balance_before:
          targetAvailable + targetHeld,
        balance_after:
          targetAvailable + targetHeld + targetValue,
        status: 'CONFIRMED'
      }
    })

    return exchange
  })
}

// --------------------------------------------------
// GET EXCHANGE BY ID
// --------------------------------------------------

const getExchangeById = async (id) => {
  return prisma.exchanges.findUnique({
    where: {
      id
    }
  })
}

// --------------------------------------------------
// GET BY IDEMPOTENCY KEY
// --------------------------------------------------

const getExchangeByIdempotencyKey = async (idempotencyKey) => {
  return prisma.exchanges.findUnique({
    where: {
      idempotency_key: idempotencyKey
    }
  })
}

// --------------------------------------------------
// GET BY USER
// --------------------------------------------------

const getExchangesByUser = async (userId) => {
  return prisma.exchanges.findMany({
    where: {
      user_id: BigInt(userId)
    },
    orderBy: {
      created_at: 'desc'
    }
  })
}

// --------------------------------------------------
// GET PENDING
// --------------------------------------------------

const getPendingExchanges = async () => {
  return prisma.exchanges.findMany({
    where: {
      status: 'PENDING_REVIEW'
    },
    orderBy: {
      created_at: 'asc'
    }
  })
}

// --------------------------------------------------
// DECIDE EXCHANGE
// --------------------------------------------------

const decideExchange = async ({
  exchangeId,
  complianceUserId,
  decision
}) => {
  if (!['APPROVE', 'REJECT'].includes(decision)) {
    throw new Error('Invalid compliance decision')
  }

  return prisma.$transaction(async (tx) => {
    // ----------------------------------------------
    // VALIDATE COMPLIANCE USER
    // ----------------------------------------------

    const complianceUser = await tx.users.findUnique({
      where: {
        id: BigInt(complianceUserId)
      }
    })

    if (!complianceUser) {
      throw new Error('Compliance user not found')
    }

    if (complianceUser.role !== 'COMPLIANCE') {
      throw new Error(
        'User is not authorized for compliance operations'
      )
    }

    // ----------------------------------------------
    // LOCK EXCHANGE
    // ----------------------------------------------

    const exchanges = await tx.$queryRaw`
      SELECT *
      FROM exchanges
      WHERE id = ${exchangeId}::uuid
      FOR UPDATE
    `

    const exchange = exchanges[0]

    if (!exchange) {
      throw new Error('Exchange not found')
    }

    if (exchange.status !== 'PENDING_REVIEW') {
      throw new Error(
        'Exchange is not available for review'
      )
    }

    if (new Date() >= exchange.expires_at) {
      throw new Error('Exchange has expired')
    }

    // ----------------------------------------------
    // COMPLIANCE DECISION
    // ----------------------------------------------

    const complianceDecision =
      await tx.compliance_decisions.findFirst({
        where: {
          exchange_id: exchangeId,
          decision: null
        },
        orderBy: {
          created_at: 'desc'
        }
      })

    if (!complianceDecision) {
      throw new Error('Compliance decision not found')
    }

    const now = new Date()

    // ----------------------------------------------
    // APPROVE
    // ----------------------------------------------

    if (decision === 'APPROVE') {
      const sourceWalletRows = await tx.$queryRaw`
        SELECT *
        FROM wallets
        WHERE user_id = ${exchange.user_id}
          AND asset_id = ${exchange.source_asset_id}
        FOR UPDATE
      `

      const sourceWallet = sourceWalletRows[0]

      if (!sourceWallet) {
        throw new Error('Source wallet not found')
      }

      const targetWalletRows = await tx.$queryRaw`
        SELECT *
        FROM wallets
        WHERE user_id = ${exchange.user_id}
          AND asset_id = ${exchange.target_asset_id}
        FOR UPDATE
      `

      const targetWallet = targetWalletRows[0]

      if (!targetWallet) {
        throw new Error('Target wallet not found')
      }

      const sourceAvailable =
        Number(sourceWallet.available_balance)

      const sourceHeld =
        Number(sourceWallet.held_balance)

      const sourceAmount =
        Number(exchange.source_amount)

      const targetAvailable =
        Number(targetWallet.available_balance)

      const targetHeld =
        Number(targetWallet.held_balance)

      const targetAmount =
        Number(exchange.target_amount)

      if (sourceHeld < sourceAmount) {
        throw new Error('Insufficient held balance')
      }

      // --------------------------------------------
      // REMOVE HOLD
      // --------------------------------------------

      await tx.wallets.update({
        where: {
          id: BigInt(sourceWallet.id)
        },
        data: {
          held_balance:
            sourceHeld - sourceAmount,
          updated_at: now
        }
      })

      await tx.ledger_entries.create({
        data: {
          wallet_id: BigInt(sourceWallet.id),
          exchange_id: exchangeId,
          movement_type: 'SETTLEMENT',
          amount: -sourceAmount,
          available_before: sourceAvailable,
          available_after: sourceAvailable,
          held_before: sourceHeld,
          held_after:
            sourceHeld - sourceAmount,
          balance_before:
            sourceAvailable + sourceHeld,
          balance_after:
            sourceAvailable +
            sourceHeld -
            sourceAmount,
          status: 'CONFIRMED'
        }
      })

      // --------------------------------------------
      // CREDIT TARGET
      // --------------------------------------------

      await tx.wallets.update({
        where: {
          id: BigInt(targetWallet.id)
        },
        data: {
          available_balance:
            targetAvailable + targetAmount,
          updated_at: now
        }
      })

      await tx.ledger_entries.create({
        data: {
          wallet_id: BigInt(targetWallet.id),
          exchange_id: exchangeId,
          movement_type: 'SETTLEMENT',
          amount: targetAmount,
          available_before: targetAvailable,
          available_after:
            targetAvailable + targetAmount,
          held_before: targetHeld,
          held_after: targetHeld,
          balance_before:
            targetAvailable + targetHeld,
          balance_after:
            targetAvailable +
            targetHeld +
            targetAmount,
          status: 'CONFIRMED'
        }
      })

      // --------------------------------------------
      // UPDATE COMPLIANCE
      // --------------------------------------------

      await tx.compliance_decisions.update({
        where: {
          id: complianceDecision.id
        },
        data: {
          decision: 'APPROVE',
          compliance_user_id:
            BigInt(complianceUserId),
          decided_at: now
        }
      })

      // --------------------------------------------
      // COMPLETE EXCHANGE
      // --------------------------------------------

      await tx.exchanges.update({
        where: {
          id: exchangeId
        },
        data: {
          status: 'COMPLETED',
          updated_at: now
        }
      })

      return {
        exchangeId,
        status: 'COMPLETED',
        decision: 'APPROVE'
      }
    }

    // ----------------------------------------------
    // REJECT
    // ----------------------------------------------

    const sourceWalletRows = await tx.$queryRaw`
      SELECT *
      FROM wallets
      WHERE user_id = ${exchange.user_id}
        AND asset_id = ${exchange.source_asset_id}
      FOR UPDATE
    `

    const sourceWallet = sourceWalletRows[0]

    if (!sourceWallet) {
      throw new Error('Source wallet not found')
    }

    const available =
      Number(sourceWallet.available_balance)

    const held =
      Number(sourceWallet.held_balance)

    const amount =
      Number(exchange.source_amount)

    if (held < amount) {
      throw new Error('Insufficient held balance')
    }

    // ----------------------------------------------
    // RELEASE HOLD
    // ----------------------------------------------

    await tx.wallets.update({
      where: {
        id: BigInt(sourceWallet.id)
      },
      data: {
        available_balance: available + amount,
        held_balance: held - amount,
        updated_at: now
      }
    })

    await tx.ledger_entries.create({
      data: {
        wallet_id: BigInt(sourceWallet.id),
        exchange_id: exchangeId,
        movement_type: 'RELEASE',
        amount,
        available_before: available,
        available_after: available + amount,
        held_before: held,
        held_after: held - amount,
        balance_before: available + held,
        balance_after: available + held,
        status: 'CONFIRMED'
      }
    })

    // ----------------------------------------------
    // UPDATE COMPLIANCE
    // ----------------------------------------------

    await tx.compliance_decisions.update({
      where: {
        id: complianceDecision.id
      },
      data: {
        decision: 'REJECT',
        compliance_user_id:
          BigInt(complianceUserId),
        decided_at: now
      }
    })

    // ----------------------------------------------
    // REJECT EXCHANGE
    // ----------------------------------------------

    await tx.exchanges.update({
      where: {
        id: exchangeId
      },
      data: {
        status: 'REJECTED',
        updated_at: now
      }
    })

    return {
      exchangeId,
      status: 'REJECTED',
      decision: 'REJECT'
    }
  })
}

module.exports = {
  createExchange,
  getExchangeById,
  getExchangeByIdempotencyKey,
  getExchangesByUser,
  getPendingExchanges,
  decideExchange
}
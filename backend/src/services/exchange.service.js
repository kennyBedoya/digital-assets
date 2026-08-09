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
  return prisma.exchanges.create({
    data: {
      id,
      user_id: BigInt(userId),
      quote_id: quoteId,
      source_asset_id: BigInt(sourceAssetId),
      target_asset_id: BigInt(targetAssetId),
      source_amount: sourceAmount,
      price,
      fee,
      target_amount: targetAmount,
      risk_level: riskLevel || null,
      requires_follow_up: requiresFollowUp || false,
      status: 'CREATED',
      idempotency_key: idempotencyKey,
      request_hash: requestHash,
      expires_at: expiresAt
    }
  })
}


const getExchangeById = async (id) => {
  return prisma.exchanges.findUnique({
    where: {
      id
    }
  })
}


const getExchangeByIdempotencyKey = async (idempotencyKey) => {
  return prisma.exchanges.findUnique({
    where: {
      idempotency_key: idempotencyKey
    }
  })
}


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


/**
 * Locks an exchange and decides it.
 *
 * Only one transaction can process the same exchange at a time.
 */
const decideExchange = async ({
  exchangeId,
  complianceUserId,
  decision
}) => {

  if (!['APPROVE', 'REJECT'].includes(decision)) {
    throw new Error('Invalid compliance decision')
  }

  return prisma.$transaction(async (tx) => {

    // -----------------------------------------------------
    // 1. Lock exchange
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // 2. Validate state
    // -----------------------------------------------------

    if (exchange.status !== 'PENDING_REVIEW') {
      throw new Error('Exchange is not available for review')
    }

    if (new Date() >= exchange.expires_at) {
      throw new Error('Exchange has expired')
    }

    // -----------------------------------------------------
    // 3. Get compliance decision
    // -----------------------------------------------------

    const complianceDecision =
      await tx.compliance_decisions.findFirst({
        where: {
          exchange_id: exchangeId
        },
        orderBy: {
          created_at: 'desc'
        }
      })

    if (!complianceDecision) {
      throw new Error('Compliance decision not found')
    }

    if (complianceDecision.decision) {
      throw new Error('Exchange has already been decided')
    }

    const now = new Date()

    // -----------------------------------------------------
    // 4. Update compliance decision
    // -----------------------------------------------------

    await tx.compliance_decisions.update({
      where: {
        id: complianceDecision.id
      },
      data: {
        decision,
        compliance_user_id: BigInt(complianceUserId),
        decided_at: now
      }
    })

    // -----------------------------------------------------
    // 5. APPROVE
    // -----------------------------------------------------

    if (decision === 'APPROVE') {

      /*
       * The actual wallet/ledger settlement will be handled
       * by the transaction logic when we connect the ledger
       * service.
       *
       * For now we only transition the exchange state.
       */

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
        decision
      }
    }

    // -----------------------------------------------------
    // 6. REJECT
    // -----------------------------------------------------

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
      decision
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
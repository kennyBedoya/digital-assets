const prisma = require('../config/prisma')


const createComplianceDecision = async ({
  exchangeId,
  riskLevel,
  reason = null
}) => {
  return prisma.compliance_decisions.create({
    data: {
      exchange_id: exchangeId,
      risk_level: riskLevel,
      reason
    }
  })
}


const getComplianceDecisionById = async (id) => {
  return prisma.compliance_decisions.findUnique({
    where: {
      id: BigInt(id)
    }
  })
}


const getComplianceDecisionByExchange = async (exchangeId) => {
  return prisma.compliance_decisions.findMany({
    where: {
      exchange_id: exchangeId
    },
    orderBy: {
      created_at: 'desc'
    }
  })
}


const getPendingComplianceDecisions = async () => {
  return prisma.compliance_decisions.findMany({
    where: {
      decision: null
    },
    include: {
      exchanges: true
    },
    orderBy: {
      created_at: 'asc'
    }
  })
}


const decideCompliance = async ({
  exchangeId,
  complianceUserId,
  decision
}) => {
  if (!['APPROVE', 'REJECT'].includes(decision)) {
    throw new Error('Invalid compliance decision')
  }

  return prisma.$transaction(async (tx) => {
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
      throw new Error('Exchange is not available for review')
    }

    if (new Date() >= exchange.expires_at) {
      throw new Error('Exchange has expired')
    }

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

    const status =
      decision === 'APPROVE'
        ? 'COMPLETED'
        : 'REJECTED'

    await tx.exchanges.update({
      where: {
        id: exchangeId
      },
      data: {
        status,
        updated_at: now
      }
    })

    return {
      exchangeId,
      decision,
      status,
      decidedAt: now
    }
  })
}


module.exports = {
  createComplianceDecision,
  getComplianceDecisionById,
  getComplianceDecisionByExchange,
  getPendingComplianceDecisions,
  decideCompliance
}
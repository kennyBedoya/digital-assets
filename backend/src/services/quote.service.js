const prisma = require('../config/prisma')


const createQuote = async ({
  id,
  userId,
  sourceAssetId,
  targetAssetId,
  sourceAmount,
  price,
  fee,
  estimatedTargetAmount,
  expiresAt
}) => {
  return prisma.quotes.create({
    data: {
      id,
      user_id: BigInt(userId),
      source_asset_id: BigInt(sourceAssetId),
      target_asset_id: BigInt(targetAssetId),
      source_amount: sourceAmount,
      price,
      fee,
      estimated_target_amount: estimatedTargetAmount,
      status: 'ACTIVE',
      expires_at: expiresAt
    }
  })
}


const getQuoteById = async (id) => {
  return prisma.quotes.findUnique({
    where: {
      id
    },
    include: {
      assets_quotes_source_asset_idToassets: true,
      assets_quotes_target_asset_idToassets: true
    }
  })
}


const getQuotesByUser = async (userId) => {
  return prisma.quotes.findMany({
    where: {
      user_id: BigInt(userId)
    },
    include: {
      assets_quotes_source_asset_idToassets: true,
      assets_quotes_target_asset_idToassets: true
    },
    orderBy: {
      created_at: 'desc'
    }
  })
}


const getActiveQuotes = async () => {
  return prisma.quotes.findMany({
    where: {
      status: 'ACTIVE',
      expires_at: {
        gt: new Date()
      }
    },
    include: {
      assets_quotes_source_asset_idToassets: true,
      assets_quotes_target_asset_idToassets: true
    },
    orderBy: {
      created_at: 'desc'
    }
  })
}


const expireQuote = async (id) => {
  return prisma.quotes.updateMany({
    where: {
      id,
      status: 'ACTIVE',
      expires_at: {
        lte: new Date()
      }
    },
    data: {
      status: 'EXPIRED'
    }
  })
}


const validateQuote = async (tx, quoteId) => {
  const quote = await tx.quotes.findUnique({
    where: {
      id: quoteId
    }
  })

  if (!quote) {
    throw new Error('Quote not found')
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

  return quote
}


module.exports = {
  createQuote,
  getQuoteById,
  getQuotesByUser,
  getActiveQuotes,
  expireQuote,
  validateQuote
}
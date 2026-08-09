const crypto = require('crypto')
const { PrismaClient } = require('../generated/prisma')

const prisma = new PrismaClient()

const main = async () => {
  console.log('Starting database seed...')

  // --------------------------------------------------
  // USERS
  // --------------------------------------------------

  const user1 = await prisma.users.create({
    data: {
      external_id: 'user-001',
      role: 'CUSTOMER'
    }
  })

  const user2 = await prisma.users.create({
    data: {
      external_id: 'user-002',
      role: 'CUSTOMER'
    }
  })

  const complianceUser = await prisma.users.create({
    data: {
      external_id: 'compliance-001',
      role: 'COMPLIANCE'
    }
  })

  // --------------------------------------------------
  // ASSETS
  // --------------------------------------------------

  const usdt = await prisma.assets.create({
    data: {
      symbol: 'USDT-SBX',
      name: 'Tether USD Sandbox',
      decimals: 6
    }
  })

  const xaut = await prisma.assets.create({
    data: {
      symbol: 'XAUT-SBX',
      name: 'Tether Gold Sandbox',
      decimals: 6
    }
  })

  // --------------------------------------------------
  // WALLETS
  // --------------------------------------------------

  const user1UsdtWallet = await prisma.wallets.create({
    data: {
      user_id: user1.id,
      asset_id: usdt.id,
      available_balance: 10000,
      held_balance: 0
    }
  })

  const user1XautWallet = await prisma.wallets.create({
    data: {
      user_id: user1.id,
      asset_id: xaut.id,
      available_balance: 100,
      held_balance: 0
    }
  })

  const user2UsdtWallet = await prisma.wallets.create({
    data: {
      user_id: user2.id,
      asset_id: usdt.id,
      available_balance: 5000,
      held_balance: 0
    }
  })

  // --------------------------------------------------
  // QUOTE
  // XAUT-SBX -> USDT-SBX
  // --------------------------------------------------

  const now = new Date()

  const quoteExpiresAt = new Date(
    now.getTime() + 5 * 60 * 1000
  )

  const quote = await prisma.quotes.create({
    data: {
      id: crypto.randomUUID(),
      user_id: user1.id,
      source_asset_id: xaut.id,
      target_asset_id: usdt.id,
      source_amount: 1,
      price: 2500,
      fee: 25,
      estimated_target_amount: 2475,
      status: 'ACTIVE',
      expires_at: quoteExpiresAt
    }
  })

  console.log('Created quote:', quote.id)

  // --------------------------------------------------
  // EXCHANGE
  // --------------------------------------------------

  const exchangeCreatedAt = new Date()

  const exchangeExpiresAt = new Date(
    exchangeCreatedAt.getTime() + 30 * 1000
  )

  const exchange = await prisma.exchanges.create({
    data: {
      id: crypto.randomUUID(),
      user_id: user1.id,
      quote_id: quote.id,
      source_asset_id: xaut.id,
      target_asset_id: usdt.id,
      source_amount: 1,
      price: 2500,
      fee: 25,
      target_amount: 2475,
      risk_level: 'LOW',
      requires_follow_up: false,
      status: 'PENDING_REVIEW',
      idempotency_key: 'seed-exchange-001',
      request_hash: 'seed-request-hash-001',
      created_at: exchangeCreatedAt,
      expires_at: exchangeExpiresAt
    }
  })

  console.log('Created exchange:', exchange.id)

  // --------------------------------------------------
  // MOVE FUNDS TO HELD
  // --------------------------------------------------

  await prisma.wallets.update({
    where: {
      id: user1XautWallet.id
    },
    data: {
      available_balance: 99,
      held_balance: 1
    }
  })

  // --------------------------------------------------
  // COMPLIANCE
  // --------------------------------------------------

  const complianceDecision = await prisma.compliance_decisions.create({
    data: {
      exchange_id: exchange.id,
      compliance_user_id: complianceUser.id,
      risk_level: 'LOW',
      decision: null
    }
  })

  console.log(
    'Created compliance decision:',
    complianceDecision.id.toString()
  )

  console.log('Database seed completed successfully.')
}

main()
  .catch((error) => {
    console.error('Seed failed:')
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
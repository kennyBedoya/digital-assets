const exchangeService = require('../../services/exchange.service')
const prisma = require('../../config/prisma')

jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'test-hash')
  }))
}))

jest.mock('../../config/prisma', () => ({
  exchanges: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
}))

describe('Exchange Service - Business Rules', () => {
  let tx

  const userId = '1'
  const complianceUserId = '2'

  const quoteId = '11111111-1111-1111-1111-111111111111'
  const exchangeId = '22222222-2222-2222-2222-222222222222'

  const sourceAssetId = '1'
  const targetAssetId = '2'

  const sourceAmount = '100'
  const targetAmount = '99.50'

  const futureDate = new Date(Date.now() + 60 * 60 * 1000)

  const createQuote = (overrides = {}) => ({
    id: quoteId,
    user_id: BigInt(userId),
    source_asset_id: BigInt(sourceAssetId),
    target_asset_id: BigInt(targetAssetId),
    source_amount: '100',
    status: 'ACTIVE',
    expires_at: futureDate,
    ...overrides
  })

  const createWallet = (overrides = {}) => ({
    id: BigInt(10),
    user_id: BigInt(userId),
    asset_id: BigInt(sourceAssetId),
    available_balance: '1000',
    held_balance: '0',
    ...overrides
  })

  const createTargetWallet = () => ({
    id: BigInt(20),
    user_id: BigInt(userId),
    asset_id: BigInt(targetAssetId),
    available_balance: '0',
    held_balance: '0'
  })

  const createExchangeRequest = (overrides = {}) => ({
    id: exchangeId,
    userId,
    quoteId,
    sourceAssetId,
    targetAssetId,
    sourceAmount,
    price: '1.05',
    fee: '0.50',
    targetAmount,
    riskLevel: 'LOW',
    requiresFollowUp: false,
    idempotencyKey: 'idem-001',
    expiresAt: futureDate,
    ...overrides
  })

  beforeEach(() => {
    jest.clearAllMocks()

    tx = {
      quotes: {
        findUnique: jest.fn(),
        update: jest.fn()
      },

      wallets: {
        update: jest.fn()
      },

      exchanges: {
        create: jest.fn(),
        update: jest.fn()
      },

      ledger_entries: {
        create: jest.fn()
      },

      compliance_decisions: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn()
      },

      users: {
        findUnique: jest.fn()
      },

      $queryRaw: jest.fn()
    }

    prisma.$transaction.mockImplementation(async callback => {
      return callback(tx)
    })
  })

  // -------------------------------------------------------
  // A. Intercambio exitoso con riesgo LOW
  // -------------------------------------------------------

  test('a. debe completar un intercambio con riesgo LOW', async () => {
    const request = createExchangeRequest({
      riskLevel: 'LOW'
    })

    prisma.exchanges.findUnique.mockResolvedValue(null)

    tx.quotes.findUnique.mockResolvedValue(createQuote())

    tx.$queryRaw
      .mockResolvedValueOnce([createWallet()])
      .mockResolvedValueOnce([createTargetWallet()])

    tx.wallets.update
    .mockResolvedValueOnce(createWallet())
    .mockResolvedValueOnce(createTargetWallet())

    tx.exchanges.create.mockResolvedValue({
      id: exchangeId,
      status: 'COMPLETED',
      risk_level: 'LOW'
    })

    tx.ledger_entries.create.mockResolvedValue({})

    const result =
      await exchangeService.createExchange(request)

    expect(result.status).toBe('COMPLETED')

    expect(result.risk_level).toBe('LOW')

    expect(tx.wallets.update).toHaveBeenCalled()

    expect(tx.ledger_entries.create).toHaveBeenCalled()

    expect(tx.compliance_decisions.create)
      .not
      .toHaveBeenCalled()
  })

  // -------------------------------------------------------
  // B. MEDIUM completada y marcada para seguimiento
  // -------------------------------------------------------

  test('b. debe completar una operación MEDIUM y marcarla para seguimiento', async () => {
    const request = createExchangeRequest({
      riskLevel: 'MEDIUM'
    })

    prisma.exchanges.findUnique.mockResolvedValue(null)

    tx.quotes.findUnique.mockResolvedValue(createQuote())

    tx.$queryRaw
      .mockResolvedValueOnce([createWallet()])
      .mockResolvedValueOnce([createTargetWallet()])

    tx.wallets.update
    .mockResolvedValueOnce(createWallet())
    .mockResolvedValueOnce(createTargetWallet())

    tx.exchanges.create.mockResolvedValue({
      id: exchangeId,
      status: 'COMPLETED',
      risk_level: 'MEDIUM',
      requires_follow_up: true
    })

    tx.ledger_entries.create.mockResolvedValue({})

    const result =
      await exchangeService.createExchange(request)

    expect(result.status).toBe('COMPLETED')

    expect(result.risk_level).toBe('MEDIUM')

    expect(result.requires_follow_up).toBe(true)

    expect(tx.compliance_decisions.create)
      .not
      .toHaveBeenCalled()
  })

  // -------------------------------------------------------
  // C. Saldo insuficiente
  // -------------------------------------------------------

  test('c. debe rechazar el intercambio por saldo insuficiente', async () => {
    const request = createExchangeRequest({
      riskLevel: 'LOW'
    })

    prisma.exchanges.findUnique.mockResolvedValue(null)

    tx.quotes.findUnique.mockResolvedValue(createQuote())

    tx.$queryRaw.mockResolvedValueOnce([
      createWallet({
        available_balance: '50'
      })
    ])

    await expect(
      exchangeService.createExchange(request)
    ).rejects.toThrow(
      'Insufficient available balance'
    )

    expect(tx.exchanges.create)
      .not
      .toHaveBeenCalled()

    expect(tx.ledger_entries.create)
      .not
      .toHaveBeenCalled()
  })

  // -------------------------------------------------------
  // D. Cotización vencida
  // -------------------------------------------------------

  test('d. debe rechazar una cotización vencida', async () => {
    const request = createExchangeRequest()

    prisma.exchanges.findUnique.mockResolvedValue(null)

    tx.quotes.findUnique.mockResolvedValue(
      createQuote({
        expires_at: new Date(Date.now() - 60000)
      })
    )

    await expect(
      exchangeService.createExchange(request)
    ).rejects.toThrow(
      'Quote has expired'
    )

    expect(tx.quotes.update).toHaveBeenCalledWith({
      where: {
        id: quoteId
      },
      data: {
        status: 'EXPIRED'
      }
    })

    expect(tx.exchanges.create)
      .not
      .toHaveBeenCalled()
  })

  // -------------------------------------------------------
  // E. Misma clave de idempotencia
  // -------------------------------------------------------

  test('e. debe devolver la operación existente cuando se repite la misma clave de idempotencia', async () => {
    const request = createExchangeRequest()

    const existingExchange = {
    id: exchangeId,
    idempotency_key: 'idem-001',
    request_hash: 'test-hash',
    status: 'COMPLETED'
    }
/* 
    const crypto = require('crypto')

    const expectedHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          userId,
          quoteId,
          sourceAssetId,
          targetAssetId,
          sourceAmount,
          price: '1.05',
          fee: '0.50',
          targetAmount,
          riskLevel: 'LOW',
          expiresAt: futureDate
        })
      )
      .digest('hex')

    request.requestHash = expectedHash */

    prisma.exchanges.findUnique.mockResolvedValue(
      existingExchange
    )

    const result =
      await exchangeService.createExchange(request)

    expect(result).toEqual(existingExchange)

    expect(prisma.$transaction)
      .not
      .toHaveBeenCalled()
  })

  // -------------------------------------------------------
  // F. Misma clave con contenido diferente
  // -------------------------------------------------------

  test('f. debe rechazar una clave de idempotencia usada con contenido diferente', async () => {
    const request = createExchangeRequest({
      sourceAmount: '200'
    })

    const existingExchange = {
      id: exchangeId,
      idempotency_key: 'idem-001',
      request_hash: 'different-original-hash',
      status: 'COMPLETED'
    }

    prisma.exchanges.findUnique.mockResolvedValue(
      existingExchange
    )

    await expect(
      exchangeService.createExchange(request)
    ).rejects.toThrow(
      'Idempotency key already used with different content'
    )

    expect(prisma.$transaction)
      .not
      .toHaveBeenCalled()
  })

  // -------------------------------------------------------
  // G. HIGH retenida
  // -------------------------------------------------------

  test('g. debe retener una operación HIGH para revisión', async () => {
    const request = createExchangeRequest({
      riskLevel: 'HIGH'
    })

    prisma.exchanges.findUnique.mockResolvedValue(null)

    tx.quotes.findUnique.mockResolvedValue(createQuote())

    tx.$queryRaw.mockResolvedValueOnce([
      createWallet()
    ])

    tx.wallets.update
    .mockResolvedValueOnce(createWallet())

    tx.exchanges.create.mockResolvedValue({
      id: exchangeId,
      status: 'PENDING_REVIEW',
      risk_level: 'HIGH',
      requires_follow_up: false
    })

    tx.ledger_entries.create.mockResolvedValue({})

    tx.compliance_decisions.create.mockResolvedValue({})

    const result =
      await exchangeService.createExchange(request)

    expect(result.status)
      .toBe('PENDING_REVIEW')

    expect(result.risk_level)
      .toBe('HIGH')

    expect(
      tx.compliance_decisions.create
    ).toHaveBeenCalled()

    expect(
      tx.ledger_entries.create
    ).toHaveBeenCalled()

    expect(tx.$queryRaw)
      .toHaveBeenCalledTimes(1)
  })

  // -------------------------------------------------------
  // H. Aprobación HIGH
  // -------------------------------------------------------

  test('h. debe aprobar una operación HIGH retenida', async () => {
    const exchange = {
      id: exchangeId,
      user_id: BigInt(userId),
      source_asset_id: BigInt(sourceAssetId),
      target_asset_id: BigInt(targetAssetId),
      source_amount: '100',
      target_amount: '99.50',
      status: 'PENDING_REVIEW',
      expires_at: futureDate
    }

    const complianceDecision = {
      id: BigInt(50),
      exchange_id: exchangeId,
      decision: null
    }

    const complianceUser = {
      id: BigInt(complianceUserId),
      role: 'COMPLIANCE'
    }

    const sourceWallet = createWallet({
      held_balance: '100',
      available_balance: '0'
    })

    const targetWallet = createTargetWallet()

    tx.users.findUnique.mockResolvedValue(
      complianceUser
    )

    tx.$queryRaw
      .mockResolvedValueOnce([exchange])
      .mockResolvedValueOnce([sourceWallet])
      .mockResolvedValueOnce([targetWallet])

    tx.compliance_decisions.findFirst
      .mockResolvedValue(complianceDecision)

    tx.wallets.update.mockResolvedValue({})

    tx.ledger_entries.create.mockResolvedValue({})

    tx.compliance_decisions.update
      .mockResolvedValue({})

    tx.exchanges.update.mockResolvedValue({})

    const result =
      await exchangeService.decideExchange({
        exchangeId,
        complianceUserId,
        decision: 'APPROVE'
      })

    expect(result.status)
      .toBe('COMPLETED')

    expect(result.decision)
      .toBe('APPROVE')

    expect(
      tx.compliance_decisions.update
    ).toHaveBeenCalled()

    expect(tx.exchanges.update)
      .toHaveBeenCalled()
  })

  // -------------------------------------------------------
  // I. Rechazo + liberación
  // -------------------------------------------------------

  test('i. debe rechazar una operación HIGH y liberar el saldo', async () => {
    const exchange = {
      id: exchangeId,
      user_id: BigInt(userId),
      source_asset_id: BigInt(sourceAssetId),
      target_asset_id: BigInt(targetAssetId),
      source_amount: '100',
      target_amount: '99.50',
      status: 'PENDING_REVIEW',
      expires_at: futureDate
    }

    const complianceDecision = {
      id: BigInt(50),
      exchange_id: exchangeId,
      decision: null
    }

    const complianceUser = {
      id: BigInt(complianceUserId),
      role: 'COMPLIANCE'
    }

    const sourceWallet = createWallet({
      available_balance: '0',
      held_balance: '100'
    })

    tx.users.findUnique.mockResolvedValue(
      complianceUser
    )

    tx.$queryRaw
      .mockResolvedValueOnce([exchange])
      .mockResolvedValueOnce([sourceWallet])

    tx.compliance_decisions.findFirst
      .mockResolvedValue(complianceDecision)

    tx.wallets.update.mockResolvedValue({})

    tx.ledger_entries.create.mockResolvedValue({})

    tx.compliance_decisions.update
      .mockResolvedValue({})

    tx.exchanges.update.mockResolvedValue({})

    const result =
      await exchangeService.decideExchange({
        exchangeId,
        complianceUserId,
        decision: 'REJECT'
      })

    expect(result.status)
      .toBe('REJECTED')

    expect(result.decision)
      .toBe('REJECT')

    expect(
      tx.wallets.update
    ).toHaveBeenCalled()

    expect(
      tx.ledger_entries.create
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movement_type: 'RELEASE',
          amount: 100
        })
      })
    )
  })

  // -------------------------------------------------------
  // J. Usuario sin rol COMPLIANCE
  // -------------------------------------------------------

  test('j. debe rechazar aprobación realizada por usuario sin rol COMPLIANCE', async () => {
    const normalUser = {
      id: BigInt(complianceUserId),
      role: 'USER'
    }

    tx.users.findUnique.mockResolvedValue(
      normalUser
    )

    await expect(
      exchangeService.decideExchange({
        exchangeId,
        complianceUserId,
        decision: 'APPROVE'
      })
    ).rejects.toThrow(
      'User is not authorized for compliance operations'
    )

    expect(tx.$queryRaw)
      .not
      .toHaveBeenCalled()

    expect(tx.exchanges.update)
      .not
      .toHaveBeenCalled()

    expect(tx.wallets.update)
      .not
      .toHaveBeenCalled()
  })
})
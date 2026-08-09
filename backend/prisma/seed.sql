BEGIN;

-- =========================================================
-- USERS
-- =========================================================

INSERT INTO users (
    external_id,
    role
)
VALUES
    ('user-001', 'CUSTOMER'),
    ('user-002', 'CUSTOMER'),
    ('compliance-001', 'COMPLIANCE');


-- =========================================================
-- ASSETS
-- =========================================================

INSERT INTO assets (
    symbol,
    name,
    decimals
)
VALUES
    ('USDT-SBX', 'Tether USD Sandbox', 6),
    ('XAUT-SBX', 'Tether Gold Sandbox', 6);


-- =========================================================
-- WALLETS
-- =========================================================

INSERT INTO wallets (
    user_id,
    asset_id,
    available_balance,
    held_balance
)
SELECT
    u.id,
    a.id,
    10000,
    0
FROM users u
JOIN assets a
    ON a.symbol = 'USDT-SBX'
WHERE u.external_id = 'user-001';


INSERT INTO wallets (
    user_id,
    asset_id,
    available_balance,
    held_balance
)
SELECT
    u.id,
    a.id,
    100,
    0
FROM users u
JOIN assets a
    ON a.symbol = 'XAUT-SBX'
WHERE u.external_id = 'user-001';


INSERT INTO wallets (
    user_id,
    asset_id,
    available_balance,
    held_balance
)
SELECT
    u.id,
    a.id,
    5000,
    0
FROM users u
JOIN assets a
    ON a.symbol = 'USDT-SBX'
WHERE u.external_id = 'user-002';


-- =========================================================
-- QUOTE
-- =========================================================

INSERT INTO quotes (
    id,
    user_id,
    source_asset_id,
    target_asset_id,
    source_amount,
    price,
    fee,
    estimated_target_amount,
    status,
    created_at,
    expires_at
)
SELECT
    gen_random_uuid(),
    u.id,
    source_asset.id,
    target_asset.id,
    1,
    2500,
    25,
    2475,
    'ACTIVE',
    NOW(),
    NOW() + INTERVAL '5 minutes'
FROM users u
JOIN assets source_asset
    ON source_asset.symbol = 'XAUT-SBX'
JOIN assets target_asset
    ON target_asset.symbol = 'USDT-SBX'
WHERE u.external_id = 'user-001';


-- =========================================================
-- EXCHANGE
-- =========================================================

INSERT INTO exchanges (
    id,
    user_id,
    quote_id,
    source_asset_id,
    target_asset_id,
    source_amount,
    price,
    fee,
    target_amount,
    risk_level,
    requires_follow_up,
    status,
    idempotency_key,
    request_hash,
    created_at,
    expires_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    q.user_id,
    q.id,
    q.source_asset_id,
    q.target_asset_id,
    q.source_amount,
    q.price,
    q.fee,
    q.estimated_target_amount,
    'LOW',
    false,
    'PENDING_REVIEW',
    'seed-exchange-001',
    'seed-request-hash-001',
    NOW(),
    NOW() + INTERVAL '30 seconds',
    NOW()
FROM quotes q
JOIN users u
    ON u.id = q.user_id
WHERE u.external_id = 'user-001'
  AND q.status = 'ACTIVE';


-- =========================================================
-- COMPLIANCE DECISION
-- =========================================================

INSERT INTO compliance_decisions (
    exchange_id,
    compliance_user_id,
    risk_level,
    decision,
    created_at
)
SELECT
    e.id,
    u.id,
    'LOW',
    NULL,
    NOW()
FROM exchanges e
JOIN users u
    ON u.external_id = 'compliance-001'
WHERE e.idempotency_key = 'seed-exchange-001';


-- =========================================================
-- LEDGER
-- =========================================================
-- Intentionally empty.
-- Ledger records will be created by the application
-- when wallet movements occur.


COMMIT;
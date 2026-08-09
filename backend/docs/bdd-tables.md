## Users
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(50) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_role_check
        CHECK (role IN ('USER', 'COMPLIANCE'))
);

## Assests
CREATE TABLE assets (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    decimals SMALLINT NOT NULL DEFAULT 8,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT assets_decimals_check
        CHECK (decimals BETWEEN 0 AND 18)
);

## Wallets
CREATE TABLE wallets (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,
    asset_id BIGINT NOT NULL,

    available_balance NUMERIC(38, 8) NOT NULL DEFAULT 0,
    held_balance NUMERIC(38, 8) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT wallets_user_fk
        FOREIGN KEY (user_id) REFERENCES users(id),

    CONSTRAINT wallets_asset_fk
        FOREIGN KEY (asset_id) REFERENCES assets(id),

    CONSTRAINT wallets_unique_user_asset
        UNIQUE (user_id, asset_id),

    CONSTRAINT wallets_available_check
        CHECK (available_balance >= 0),

    CONSTRAINT wallets_held_check
        CHECK (held_balance >= 0)
);

## Quotes 
CREATE TABLE quotes (
    id UUID PRIMARY KEY,

    user_id BIGINT NOT NULL,

    source_asset_id BIGINT NOT NULL,
    target_asset_id BIGINT NOT NULL,

    source_amount NUMERIC(38, 8) NOT NULL,
    price NUMERIC(38, 8) NOT NULL,
    fee NUMERIC(38, 8) NOT NULL,
    estimated_target_amount NUMERIC(38, 8) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT quotes_user_fk
        FOREIGN KEY (user_id) REFERENCES users(id),

    CONSTRAINT quotes_source_asset_fk
        FOREIGN KEY (source_asset_id) REFERENCES assets(id),

    CONSTRAINT quotes_target_asset_fk
        FOREIGN KEY (target_asset_id) REFERENCES assets(id),

    CONSTRAINT quotes_status_check
        CHECK (
            status IN ('ACTIVE', 'EXPIRED', 'USED')
        ),

    CONSTRAINT quotes_source_amount_check
        CHECK (source_amount > 0),

    CONSTRAINT quotes_price_check
        CHECK (price > 0),

    CONSTRAINT quotes_fee_check
        CHECK (fee >= 0),

    CONSTRAINT quotes_target_amount_check
        CHECK (estimated_target_amount >= 0),

    CONSTRAINT quotes_assets_different
        CHECK (source_asset_id <> target_asset_id),

    CONSTRAINT quotes_expiration_check
        CHECK (expires_at > created_at)
);

## Exchanges
CREATE TABLE exchanges (
    id UUID PRIMARY KEY,

    user_id BIGINT NOT NULL,
    quote_id UUID NOT NULL,

    source_asset_id BIGINT NOT NULL,
    target_asset_id BIGINT NOT NULL,

    source_amount NUMERIC(38, 8) NOT NULL,
    price NUMERIC(38, 8) NOT NULL,
    fee NUMERIC(38, 8) NOT NULL,
    target_amount NUMERIC(38, 8) NOT NULL,

    risk_level VARCHAR(20),
    requires_follow_up BOOLEAN NOT NULL DEFAULT FALSE,

    status VARCHAR(30) NOT NULL DEFAULT 'CREATED',

    idempotency_key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT exchanges_user_fk
        FOREIGN KEY (user_id) REFERENCES users(id),

    CONSTRAINT exchanges_quote_fk
        FOREIGN KEY (quote_id) REFERENCES quotes(id),

    CONSTRAINT exchanges_source_asset_fk
        FOREIGN KEY (source_asset_id) REFERENCES assets(id),

    CONSTRAINT exchanges_target_asset_fk
        FOREIGN KEY (target_asset_id) REFERENCES assets(id),

    CONSTRAINT exchanges_status_check
        CHECK (
            status IN (
                'CREATED',
                'PROCESSING',
                'PENDING_REVIEW',
                'COMPLETED',
                'REJECTED',
                'FAILED',
                'EXPIRED'
            )
        ),

    CONSTRAINT exchanges_risk_check
        CHECK (
            risk_level IS NULL
            OR risk_level IN ('LOW', 'MEDIUM', 'HIGH')
        ),

    CONSTRAINT exchanges_amount_check
        CHECK (source_amount > 0),

    CONSTRAINT exchanges_price_check
        CHECK (price > 0),

    CONSTRAINT exchanges_fee_check
        CHECK (fee >= 0),

    CONSTRAINT exchanges_target_amount_check
        CHECK (target_amount >= 0),

    CONSTRAINT exchanges_assets_different
        CHECK (source_asset_id <> target_asset_id),

    CONSTRAINT exchanges_idempotency_unique
        UNIQUE (idempotency_key),

    CONSTRAINT exchanges_expiration_check
        CHECK (expires_at > created_at)
);

## Ledger entries
CREATE TABLE ledger_entries (
    id BIGSERIAL PRIMARY KEY,

    wallet_id BIGINT NOT NULL,
    exchange_id UUID,

    movement_type VARCHAR(20) NOT NULL,
    amount NUMERIC(38, 8) NOT NULL,

    available_before NUMERIC(38, 8) NOT NULL,
    available_after NUMERIC(38, 8) NOT NULL,

    held_before NUMERIC(38, 8) NOT NULL,
    held_after NUMERIC(38, 8) NOT NULL,

    balance_before NUMERIC(38, 8) NOT NULL,
    balance_after NUMERIC(38, 8) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ledger_wallet_fk
        FOREIGN KEY (wallet_id) REFERENCES wallets(id),

    CONSTRAINT ledger_exchange_fk
        FOREIGN KEY (exchange_id) REFERENCES exchanges(id),

    CONSTRAINT ledger_movement_type_check
        CHECK (
            movement_type IN (
                'DEBIT',
                'CREDIT',
                'HOLD',
                'RELEASE'
            )
        ),

    CONSTRAINT ledger_amount_check
        CHECK (amount > 0),

    CONSTRAINT ledger_available_before_check
        CHECK (available_before >= 0),

    CONSTRAINT ledger_available_after_check
        CHECK (available_after >= 0),

    CONSTRAINT ledger_held_before_check
        CHECK (held_before >= 0),

    CONSTRAINT ledger_held_after_check
        CHECK (held_after >= 0),

    CONSTRAINT ledger_balance_before_check
        CHECK (balance_before >= 0),

    CONSTRAINT ledger_balance_after_check
        CHECK (balance_after >= 0),

    CONSTRAINT ledger_status_check
        CHECK (
            status IN ('CONFIRMED', 'REVERSED')
        )
);

## Compliance decisions
CREATE TABLE compliance_decisions (
    id BIGSERIAL PRIMARY KEY,

    exchange_id UUID NOT NULL,
    compliance_user_id BIGINT,

    risk_level VARCHAR(20) NOT NULL,
    decision VARCHAR(20),

    reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMPTZ,

    CONSTRAINT compliance_exchange_fk
        FOREIGN KEY (exchange_id) REFERENCES exchanges(id),

    CONSTRAINT compliance_user_fk
        FOREIGN KEY (compliance_user_id) REFERENCES users(id),

    CONSTRAINT compliance_risk_check
        CHECK (
            risk_level IN ('LOW', 'MEDIUM', 'HIGH')
        ),

    CONSTRAINT compliance_decision_check
        CHECK (
            decision IS NULL
            OR decision IN ('APPROVED', 'REJECTED')
        )
);

## Index
CREATE INDEX idx_wallets_user_id
    ON wallets (user_id);

CREATE INDEX idx_ledger_wallet_created
    ON ledger_entries (wallet_id, created_at);

CREATE INDEX idx_ledger_exchange
    ON ledger_entries (exchange_id);

CREATE INDEX idx_quotes_user
    ON quotes (user_id);

CREATE INDEX idx_quotes_status_expiration
    ON quotes (status, expires_at);

CREATE INDEX idx_exchanges_user
    ON exchanges (user_id);

CREATE INDEX idx_exchanges_status
    ON exchanges (status);

CREATE INDEX idx_exchanges_expiration
    ON exchanges (expires_at);

CREATE INDEX idx_compliance_exchange
    ON compliance_decisions (exchange_id);

CREATE INDEX idx_exchanges_pending_review
    ON exchanges (status)
    WHERE status = 'PENDING_REVIEW';
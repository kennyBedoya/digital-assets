-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "assets" (
    "id" BIGSERIAL NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "decimals" SMALLINT NOT NULL DEFAULT 8,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_decisions" (
    "id" BIGSERIAL NOT NULL,
    "exchange_id" UUID NOT NULL,
    "compliance_user_id" BIGINT,
    "risk_level" VARCHAR(20) NOT NULL,
    "decision" VARCHAR(20),
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(6),

    CONSTRAINT "compliance_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchanges" (
    "id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "quote_id" UUID NOT NULL,
    "source_asset_id" BIGINT NOT NULL,
    "target_asset_id" BIGINT NOT NULL,
    "source_amount" DECIMAL(38,8) NOT NULL,
    "price" DECIMAL(38,8) NOT NULL,
    "fee" DECIMAL(38,8) NOT NULL,
    "target_amount" DECIMAL(38,8) NOT NULL,
    "risk_level" VARCHAR(20),
    "requires_follow_up" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(30) NOT NULL DEFAULT 'CREATED',
    "idempotency_key" VARCHAR(255) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" BIGSERIAL NOT NULL,
    "wallet_id" BIGINT NOT NULL,
    "exchange_id" UUID,
    "movement_type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(38,8) NOT NULL,
    "available_before" DECIMAL(38,8) NOT NULL,
    "available_after" DECIMAL(38,8) NOT NULL,
    "held_before" DECIMAL(38,8) NOT NULL,
    "held_after" DECIMAL(38,8) NOT NULL,
    "balance_before" DECIMAL(38,8) NOT NULL,
    "balance_after" DECIMAL(38,8) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "source_asset_id" BIGINT NOT NULL,
    "target_asset_id" BIGINT NOT NULL,
    "source_amount" DECIMAL(38,8) NOT NULL,
    "price" DECIMAL(38,8) NOT NULL,
    "fee" DECIMAL(38,8) NOT NULL,
    "estimated_target_amount" DECIMAL(38,8) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "external_id" VARCHAR(50) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "asset_id" BIGINT NOT NULL,
    "available_balance" DECIMAL(38,8) NOT NULL DEFAULT 0,
    "held_balance" DECIMAL(38,8) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assets_symbol_key" ON "assets"("symbol");

-- CreateIndex
CREATE INDEX "idx_compliance_exchange" ON "compliance_decisions"("exchange_id");

-- CreateIndex
CREATE UNIQUE INDEX "exchanges_idempotency_unique" ON "exchanges"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_exchanges_expiration" ON "exchanges"("expires_at");

-- CreateIndex
CREATE INDEX "idx_exchanges_pending_review" ON "exchanges"("status") WHERE ((status)::text = 'PENDING_REVIEW'::text);

-- CreateIndex
CREATE INDEX "idx_exchanges_status" ON "exchanges"("status");

-- CreateIndex
CREATE INDEX "idx_exchanges_user" ON "exchanges"("user_id");

-- CreateIndex
CREATE INDEX "idx_ledger_exchange" ON "ledger_entries"("exchange_id");

-- CreateIndex
CREATE INDEX "idx_ledger_wallet_created" ON "ledger_entries"("wallet_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_quotes_status_expiration" ON "quotes"("status", "expires_at");

-- CreateIndex
CREATE INDEX "idx_quotes_user" ON "quotes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_external_id_key" ON "users"("external_id");

-- CreateIndex
CREATE INDEX "idx_wallets_user_id" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_unique_user_asset" ON "wallets"("user_id", "asset_id");

-- AddForeignKey
ALTER TABLE "compliance_decisions" ADD CONSTRAINT "compliance_exchange_fk" FOREIGN KEY ("exchange_id") REFERENCES "exchanges"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "compliance_decisions" ADD CONSTRAINT "compliance_user_fk" FOREIGN KEY ("compliance_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_quote_fk" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_source_asset_fk" FOREIGN KEY ("source_asset_id") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_target_asset_fk" FOREIGN KEY ("target_asset_id") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_exchange_fk" FOREIGN KEY ("exchange_id") REFERENCES "exchanges"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_wallet_fk" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_source_asset_fk" FOREIGN KEY ("source_asset_id") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_target_asset_fk" FOREIGN KEY ("target_asset_id") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_asset_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;


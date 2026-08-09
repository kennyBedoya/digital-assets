                 EXCHANGE SERVICE
                        │
                        ▼
                ┌───────────────┐
                │ LedgerService │
                └───────┬───────┘
                        │
                  BEGIN TX
                        │
                        ▼
               LOCK WALLET FOR UPDATE
                        │
                        ▼
              ┌────────────────────┐
              │ Calculate balances │
              │ before / after     │
              └─────────┬──────────┘
                        │
                        ▼
                  LEDGER ENTRY
                        │
                        ▼
                  UPDATE WALLET
                        │
                        ▼
                  UPDATE EXCHANGE
                        │
                        ▼
                     COMMIT
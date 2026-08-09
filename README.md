# digital-assets
Fullstack App - Backed: Node.js (Express.js) -- Frontend: Vue.js (mocks)  -- BDD: PostgreSQL



## Architecture by Technologies
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND — VUE.JS                    │
│                                                         │
│  Mockup de baja fidelidad                              │
│  • Dashboard Usuario                                   │
│  • Solicitud Exchange                                  │
│  • Resultado Exchange                                  │
│  • Bandeja Compliance                                  │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ API REST
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 BACKEND — NODE.JS                      │
│                       EXPRESS                           │
│                                                         │
│  Users │ Wallets │ Ledger │ Quotes │ Exchanges         │
│                    Compliance                          │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                     POSTGRESQL                          │
│                                                         │
│ Users │ Assets │ Wallets │ Ledger │ Quotes │ Exchanges │
│                    Compliance                          │
└─────────────────────────────────────────────────────────┘
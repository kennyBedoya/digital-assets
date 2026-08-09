const express = require('express')

const assetRoutes = require('./routes/asset.routes')
const userRoutes = require('./routes/user.routes')
const walletRoutes = require('./routes/wallet.routes')
const quoteRoutes = require('./routes/quote.routes')
const exchangeRoutes = require('./routes/exchange.routes')
const ledgerRoutes = require('./routes/ledger.routes')
const complianceRoutes = require('./routes/compliance.routes')

const app = express()

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({
    status: 'ok'
  })
})

app.use('/api/assets', assetRoutes)
app.use('/api/users', userRoutes)
app.use('/api/wallets', walletRoutes)
app.use('/api/quotes', quoteRoutes)
app.use('/api/exchanges', exchangeRoutes)
app.use('/api/ledger', ledgerRoutes)
app.use('/api/compliance', complianceRoutes)

module.exports = app
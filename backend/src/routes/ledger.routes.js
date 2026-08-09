const express = require('express')
const controller = require('../controllers/ledger.controller')

const router = express.Router()

router.get('/', controller.getLedger)
router.get('/wallet/:walletId', controller.getLedgerByWallet)
router.get('/exchange/:exchangeId', controller.getLedgerByExchange)
router.get('/:id', controller.getLedgerEntryById)

module.exports = router
const express = require('express')
const controller = require('../controllers/wallet.controller')

const router = express.Router()

router.post('/', controller.createWallet)
router.get('/', controller.getWallets)
router.get('/:id', controller.getWalletById)
router.get('/user/:userId', controller.getWalletsByUser)

module.exports = router
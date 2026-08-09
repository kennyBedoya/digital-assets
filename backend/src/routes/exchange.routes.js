const express = require('express')
const controller = require('../controllers/exchange.controller')

const router = express.Router()

router.post('/', controller.createExchange)
router.get('/pending', controller.getPendingExchanges)
router.get('/user/:userId', controller.getExchangesByUser)
router.get('/:id', controller.getExchangeById)
router.post('/:id/decision', controller.decideExchange)

module.exports = router
const express = require('express')
const controller = require('../controllers/quote.controller')

const router = express.Router()

router.post('/', controller.createQuote)
router.get('/active', controller.getActiveQuotes)
router.get('/user/:userId', controller.getQuotesByUser)
router.get('/:id', controller.getQuoteById)

module.exports = router
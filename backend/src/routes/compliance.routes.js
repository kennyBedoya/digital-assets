const express = require('express')
const controller = require('../controllers/compliance.controller')

const router = express.Router()

router.post('/', controller.createComplianceDecision)
router.get('/pending', controller.getPendingComplianceDecisions)
router.get('/exchange/:exchangeId', controller.getComplianceDecisionByExchange)
router.get('/:id', controller.getComplianceDecisionById)
router.post('/:exchangeId/decision', controller.decideCompliance)

module.exports = router
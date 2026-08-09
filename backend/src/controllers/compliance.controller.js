const complianceService = require('../services/compliance.service')


const createComplianceDecision = async (req, res) => {
  try {
    const decision = await complianceService.createComplianceDecision(
      req.body
    )

    res.status(201).json(decision)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getComplianceDecisionById = async (req, res) => {
  try {
    const decision =
      await complianceService.getComplianceDecisionById(req.params.id)

    if (!decision) {
      return res.status(404).json({
        error: 'Compliance decision not found'
      })
    }

    res.json(decision)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getComplianceDecisionByExchange = async (req, res) => {
  try {
    const decisions =
      await complianceService.getComplianceDecisionByExchange(
        req.params.exchangeId
      )

    res.json(decisions)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getPendingComplianceDecisions = async (req, res) => {
  try {
    const decisions =
      await complianceService.getPendingComplianceDecisions()

    res.json(decisions)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}


const decideCompliance = async (req, res) => {
  try {
    const result = await complianceService.decideCompliance({
      exchangeId: req.params.exchangeId,
      complianceUserId: req.body.complianceUserId,
      decision: req.body.decision
    })

    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


module.exports = {
  createComplianceDecision,
  getComplianceDecisionById,
  getComplianceDecisionByExchange,
  getPendingComplianceDecisions,
  decideCompliance
}
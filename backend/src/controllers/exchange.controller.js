const exchangeService = require('../services/exchange.service')


const createExchange = async (req, res) => {
  try {
    const exchange = await exchangeService.createExchange(req.body)
    res.status(201).json(exchange)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getExchangeById = async (req, res) => {
  try {
    const exchange = await exchangeService.getExchangeById(req.params.id)

    if (!exchange) {
      return res.status(404).json({ error: 'Exchange not found' })
    }

    res.json(exchange)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getExchangesByUser = async (req, res) => {
  try {
    const exchanges = await exchangeService.getExchangesByUser(
      req.params.userId
    )

    res.json(exchanges)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getPendingExchanges = async (req, res) => {
  try {
    const exchanges = await exchangeService.getPendingExchanges()
    res.json(exchanges)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}


const decideExchange = async (req, res) => {
  try {
    const result = await exchangeService.decideExchange({
      exchangeId: req.params.id,
      complianceUserId: req.body.complianceUserId,
      decision: req.body.decision
    })

    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


module.exports = {
  createExchange,
  getExchangeById,
  getExchangesByUser,
  getPendingExchanges,
  decideExchange
}
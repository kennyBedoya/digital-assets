const quoteService = require('../services/quote.service')


const createQuote = async (req, res) => {
  try {
    const quote = await quoteService.createQuote(req.body)
    res.status(201).json(quote)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getQuoteById = async (req, res) => {
  try {
    const quote = await quoteService.getQuoteById(req.params.id)

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' })
    }

    res.json(quote)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getQuotesByUser = async (req, res) => {
  try {
    const quotes = await quoteService.getQuotesByUser(req.params.userId)
    res.json(quotes)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getActiveQuotes = async (req, res) => {
  try {
    const quotes = await quoteService.getActiveQuotes()
    res.json(quotes)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}


module.exports = {
  createQuote,
  getQuoteById,
  getQuotesByUser,
  getActiveQuotes
}
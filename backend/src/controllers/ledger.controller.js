const ledgerService = require('../services/ledger.service')


const getLedger = async (req, res) => {
  try {
    const ledger = await ledgerService.getLedger()
    res.json(ledger)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}


const getLedgerEntryById = async (req, res) => {
  try {
    const entry = await ledgerService.getLedgerEntryById(req.params.id)

    if (!entry) {
      return res.status(404).json({ error: 'Ledger entry not found' })
    }

    res.json(entry)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getLedgerByWallet = async (req, res) => {
  try {
    const entries = await ledgerService.getLedgerByWallet(
      req.params.walletId
    )

    res.json(entries)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getLedgerByExchange = async (req, res) => {
  try {
    const entries = await ledgerService.getLedgerByExchange(
      req.params.exchangeId
    )

    res.json(entries)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


module.exports = {
  getLedger,
  getLedgerEntryById,
  getLedgerByWallet,
  getLedgerByExchange
}
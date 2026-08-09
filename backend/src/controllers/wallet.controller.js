const walletService = require('../services/wallet.service')


const createWallet = async (req, res) => {
  try {
    const wallet = await walletService.createWallet(req.body)
    res.status(201).json(wallet)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getWallets = async (req, res) => {
  try {
    const wallets = await walletService.getWallets()
    res.json(wallets)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}


const getWalletById = async (req, res) => {
  try {
    const wallet = await walletService.getWalletById(req.params.id)

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' })
    }

    res.json(wallet)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getWalletsByUser = async (req, res) => {
  try {
    const wallets = await walletService.getWalletsByUser(req.params.userId)
    res.json(wallets)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


module.exports = {
  createWallet,
  getWallets,
  getWalletById,
  getWalletsByUser
}
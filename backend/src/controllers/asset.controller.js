const assetService = require('../services/asset.service')


const createAsset = async (req, res) => {
  try {
    const asset = await assetService.createAsset(req.body)
    res.status(201).json(asset)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getAssets = async (req, res) => {
  try {
    const assets = await assetService.getAssets()
    res.json(assets)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}


const getAssetById = async (req, res) => {
  try {
    const asset = await assetService.getAssetById(req.params.id)

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' })
    }

    res.json(asset)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


module.exports = {
  createAsset,
  getAssets,
  getAssetById
}
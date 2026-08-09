const express = require('express')
const controller = require('../controllers/asset.controller')

const router = express.Router()

router.post('/', controller.createAsset)
router.get('/', controller.getAssets)
router.get('/:id', controller.getAssetById)

module.exports = router
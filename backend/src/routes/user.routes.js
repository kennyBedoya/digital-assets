const express = require('express')
const controller = require('../controllers/user.controller')

const router = express.Router()

router.post('/', controller.createUser)
router.get('/', controller.getUsers)
router.get('/:id', controller.getUserById)
router.get('/:id/wallets', controller.getUserWithWallets)

module.exports = router
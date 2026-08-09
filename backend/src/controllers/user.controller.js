const userService = require('../services/user.service')


const createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body)
    res.status(201).json(user)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getUsers = async (req, res) => {
  try {
    const users = await userService.getUsers()
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}


const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(user)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


const getUserWithWallets = async (req, res) => {
  try {
    const user = await userService.getUserWithWallets(req.params.id)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(user)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


module.exports = {
  createUser,
  getUsers,
  getUserById,
  getUserWithWallets
}
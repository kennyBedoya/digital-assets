const prisma = require('../config/prisma')


const createUser = async ({
  externalId,
  role
}) => {
  return prisma.users.create({
    data: {
      external_id: externalId,
      role
    }
  })
}


const getUserById = async (id) => {
  return prisma.users.findUnique({
    where: {
      id: BigInt(id)
    }
  })
}


const getUserByExternalId = async (externalId) => {
  return prisma.users.findUnique({
    where: {
      external_id: externalId
    }
  })
}


const getUsers = async () => {
  return prisma.users.findMany({
    orderBy: {
      id: 'asc'
    }
  })
}


const getUserWithWallets = async (id) => {
  return prisma.users.findUnique({
    where: {
      id: BigInt(id)
    },
    include: {
      wallets: {
        include: {
          assets: true
        },
        orderBy: {
          id: 'asc'
        }
      }
    }
  })
}


module.exports = {
  createUser,
  getUserById,
  getUserByExternalId,
  getUsers,
  getUserWithWallets
}
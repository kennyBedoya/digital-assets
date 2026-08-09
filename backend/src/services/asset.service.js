const prisma = require('../config/prisma')


const createAsset = async ({
  symbol,
  name,
  decimals = 8
}) => {
  return prisma.assets.create({
    data: {
      symbol,
      name,
      decimals
    }
  })
}


const getAssetById = async (id) => {
  return prisma.assets.findUnique({
    where: {
      id: BigInt(id)
    }
  })
}


const getAssetBySymbol = async (symbol) => {
  return prisma.assets.findUnique({
    where: {
      symbol
    }
  })
}


const getAssets = async () => {
  return prisma.assets.findMany({
    orderBy: {
      id: 'asc'
    }
  })
}


const getAssetWithWallets = async (id) => {
  return prisma.assets.findUnique({
    where: {
      id: BigInt(id)
    },
    include: {
      wallets: {
        include: {
          users: true
        },
        orderBy: {
          id: 'asc'
        }
      }
    }
  })
}


module.exports = {
  createAsset,
  getAssetById,
  getAssetBySymbol,
  getAssets,
  getAssetWithWallets
}
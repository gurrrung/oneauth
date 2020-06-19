const { models } = require('../db/models')

function findOrCreateDemographic(userId) {
  return models.Demographic.findCreateFind({
    where: { userId },
    include: [models.Address],
  })
}

function createAddress(options) {
  return models.Address.create(options)
}

function findDemographic(userId) {
  return models.Demographic.findOne({
    where: { userId },
  })
}

function findAddress(userId, demoUserId) {
  return models.Address.findOne({
    where: {
      id: userId,
      '$demographic.userId$': demoUserId,
    },
    include: [models.Demographic, models.State, models.Country],
  })
}

function updateAddressbyAddrId(addrId, options) {
  return models.Address.update(options, {
    where: { id: addrId },
  })
}

function updateAddressbyDemoId(demoId, options) {
  return models.Address.update(options, {
    where: { id: demoId },
  })
}

function findAllAddresses(userId, includes = [models.Demographic]) {
  return models.Address.findAll({
    where: { '$demographic.userId$': userId },
    include: includes,
  })
}

function findAllStates() {
  return models.State.findAll({})
}

function findAllCountries() {
  return models.Country.findAll({})
}

function findAllBranches() {
  return models.Branch.findAll({})
}
function findAllColleges() {
  return models.College.findAll({
    order: [['name', 'ASC']],
  })
}

function upsertDemographic(
  id,
  userId,
  collegeId,
  branchId,
  otherCollege,
  opts = {}
) {
  const { transaction = null } = opts
  if (!id && !userId) {
    throw new Error('To upsert demographic either id or userid needed')
  }
  return models.Demographic.upsert(
    {
      id,
      userId,
      collegeId,
      branchId,
      otherCollege,
    },
    {
      transaction,
    }
  )
}

function upsertAddress(values) {
  return models.Address.upsert(values)
}

const setVerifiedMobileNull = (verifiedmobile, mobile) => {
  // If mobile is verified and there is a change on update
  // update mobile_number, set verifiedmobile = null
  if (verifiedmobile && verifiedmobile !== mobile) {
    return true
    // If mobile is verified and there no change on update, just update mobile_number
  }
  if (verifiedmobile && verifiedmobile === mobile) {
    return false
  }
  return false
}

module.exports = {
  findOrCreateDemographic,
  updateAddressbyDemoId,
  updateAddressbyAddrId,
  findAddress,
  createAddress,
  findAllAddresses,
  findDemographic,
  findAllStates,
  findAllCountries,
  findAllBranches,
  findAllColleges,
  upsertDemographic,
  upsertAddress,
  setVerifiedMobileNull,
}

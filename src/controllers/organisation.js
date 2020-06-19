const generator = require('../utils/generator')
const urlutils = require('../utils/urlutils')
const {
  Organisation,
  OrgAdmin,
  OrgMember,
  User,
} = require('../db/models').models
const { findUserById } = require('./user')

function findOrganisationById(id, includes) {
  return Organisation.findOne({
    where: { id },
    include: includes,
  })
}

function findAllOrganisationsByUserId(userId) {
  return User.findById(userId, {
    include: [{ model: Organisation }],
  }).then((user) => user.organisations)
}

function findAllOrganisations() {
  return Organisation.findAll({})
}

async function createOrganisation(options, userId) {
  options.orgDomains.forEach((url, i, arr) => {
    arr[i] = urlutils.prefixHttp(url)
  })
  const organisation = await Organisation.create({
    id: generator.genNdigitNum(10),
    name: options.name,
    full_name: options.full_name,
    domain: options.orgDomains,
    website: options.website,
  })
  await OrgAdmin.create({
    organisationId: organisation.id,
    userId,
  })
  return organisation
}

function updateOrganisation(options, orgId) {
  options.orgDomains.forEach((url, i, arr) => {
    arr[i] = urlutils.prefixHttp(url)
  })
  const update = {
    name: options.name,
    full_name: options.full_name,
    domain: options.orgDomains,
    website: options.website,
  }
  return Organisation.update(update, {
    where: { id: orgId },
  })
}

function addAdminToOrg(orgId, userId) {
  return OrgAdmin.create({
    userId,
    organisationId: orgId,
  })
}

function addMemberToOrg(email, orgId, userId) {
  return OrgMember.create({
    userId,
    orgId,
    email,
  })
}

async function findAllAdmins(id) {
  const orgadmin = await OrgAdmin.findAll({
    where: { organisationId: id },
  })
  const admins = []

  for (const admin of orgadmin) {
    const user = await findUserById(admin.userId)
    const Admin = {
      name: `${user.firstname} ${user.lastname}`,
      email: user.email,
    }
    admins.push(Admin)
  }
  return admins
}

async function findAllMembers(id) {
  const orgmember = await OrgMember.findAll({
    where: { organisationId: id },
  })
  const members = []

  for (const member of orgmember) {
    const user = await findUserById(member.userId)
    const Member = {
      name: `${user.firstname} ${user.lastname}`,
      email: user.email,
    }
    members.push(Member)
  }
  return members
}

module.exports = {
  findOrganisationById,
  findAllOrganisationsByUserId,
  findAllOrganisations,
  createOrganisation,
  updateOrganisation,
  addAdminToOrg,
  addMemberToOrg,
  findAllAdmins,
  findAllMembers,
}

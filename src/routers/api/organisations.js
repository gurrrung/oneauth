const Raven = require('raven')
const router = require('express').Router()
const cel = require('connect-ensure-login')

const {
  createOrganisation,
  updateOrganisation,
  addAdminToOrg,
  addMemberToOrg,
} = require('../../controllers/organisation')

const { findUserById } = require('../../controllers/user')

router.post('/add', cel.ensureLoggedIn('/login'), async (req, res) => {
  const options = {
    name: req.body.name,
    full_name: req.body.full_name,
    orgDomains: req.body.domain.replace(/ /g, '').split(';'),
    website: req.body.website,
  }

  try {
    const org = await createOrganisation(options, req.user.id)
    res.redirect(`/organisations/${org.id}`)
  } catch (error) {
    Raven.captureException(error)
    req.flash('error', 'Could not create organisation')
    res.redirect('/users/me')
  }
})

router.post('/edit/:id', cel.ensureLoggedIn('/login'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.id, 10)
    const options = {
      name: req.body.name,
      full_name: req.body.full_name,
      orgDomains: req.body.domain.replace(/ /g, '').split(';'),
      website: req.body.website,
    }
    await updateOrganisation(options, orgId)

    res.redirect(`/organisations/${orgId}`)
  } catch (error) {
    Raven.captureException(error)
    req.flash('error', 'Could not update organisation')
    res.redirect(`/organisations/${orgId}`)
  }
})

router.post(
  '/:id/add_admin',
  cel.ensureLoggedIn('/login'),
  async (req, res) => {
    try {
      const orgId = parseInt(req.params.id, 10)
      const { userId } = req.body

      await addAdminToOrg(orgId, userId)
      res.redirect(`/organisations/${orgId}`)
    } catch (error) {
      Raven.captureException(error)
      req.flash('error', 'Could not add admin')
      res.redirect(`/organisations/${orgId}`)
    }
  }
)

router.post(
  '/:id/add_member',
  cel.ensureLoggedIn('/login'),
  async (req, res) => {
    try {
      const orgId = req.params.id
      const { userId } = req.body

      const user = await findUserById(userId)
      const { email } = user

      await addMemberToOrg(email, orgId, userId)
      res.redirect(`/organisations/${orgId}`)
    } catch (error) {
      Raven.captureException(error)
      req.flash('error', 'Could not add member')
      res.redirect(`/organisations/${orgId}`)
    }
  }
)

module.exports = router

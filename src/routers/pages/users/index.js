/**
 * Created by championswimmer on 13/03/17.
 */
const Raven = require('raven')
const cel = require('connect-ensure-login')
const router = require('express').Router()
const { models } = require('../../../db/models')
const acl = require('../../../middlewares/acl')

const { findUserById, updateUserById } = require('../../../controllers/user')

const meRoute = require('./me')
const {
  parseNumber,
  validateNumber,
} = require('../../../utils/mobile_validator')
const { validateReferralCode } = require('../../../utils/referral')

router.use('/me', meRoute)

router.get(
  '/:id',
  cel.ensureLoggedIn('/login'),
  acl.ensureRole('admin'),
  async (req, res, next) => {
    try {
      const user = await findUserById(req.params.id, [
        models.UserGithub,
        models.UserGoogle,
        models.UserFacebook,
        models.UserLms,
        models.UserTwitter,
      ])
      if (!user) {
        return res.status(404).send({ error: 'Not found' })
      }
      return res.render('user/id', { user })
    } catch (err) {
      Raven.captureException(err)
      req.flash('error', 'Could not fetch user')
      res.redirect('user/me')
    }
  }
)

router.get(
  '/:id/edit',
  cel.ensureLoggedIn('/login'),
  acl.ensureRole('admin'),
  async (req, res, next) => {
    try {
      const user = await findUserById(req.params.id)
      if (!user) {
        return res.status(404).send({ error: 'Not found' })
      }
      return res.render('user/id/edit', { user })
    } catch (err) {
      Raven.captureException(err)
      req.flash('error', 'Error in Server')
      res.redirect('user/id')
    }
  }
)

router.post(
  '/:id/edit',
  cel.ensureLoggedIn('/login'),
  acl.ensureRole('admin'),
  async (req, res, next) => {
    const number = parseNumber(req.body.mobile_number)
    let mobile_number = ''
    let referral_code = ''

    try {
      if (validateNumber(number)) {
        // eslint-disable-next-line prefer-destructuring
        mobile_number = number.values_[5]
      } else {
        req.flash('error', 'Please enter a valid number!')
        return res.redirect(`../${req.params.id}/edit`)
      }

      if (validateReferralCode(req.body.referralCode)) {
        referral_code = req.body.referralCode.toUpperCase()
      } else {
        req.flash(
          'error',
          'Please enter a six digit alphanumeric referral code'
        )
        return res.redirect(`../${req.params.id}/edit`)
      }

      await updateUserById(req.params.id, {
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        gender: req.body.gender,
        email: req.body.email,
        mobile_number,
        referralCode: referral_code,
        role: req.body.role !== 'unchanged' ? req.body.role : undefined,
      })
      return res.redirect(`../${req.params.id}`)
    } catch (err) {
      Raven.captureException(err)
      req.flash('error', 'Could not update User')
      res.redirect(`../${req.params.id}`)
    }
  }
)

module.exports = router

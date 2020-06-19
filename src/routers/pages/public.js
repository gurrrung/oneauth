/**
 * Created by championswimmer on 13/03/17.
 *
 * This route contains pages that are visible to public (without logging in)
 */
const Raven = require('raven')
const cel = require('connect-ensure-login')
const router = require('express').Router()
const debug = require('debug')('login_using_otp:routes:login_otp')
const { models } = require('../../db/models')
const {
  findAllBranches,
  findAllColleges,
  findAllCountries,
} = require('../../controllers/demographics')
const {
  parseNumberByCountry,
  validateNumber,
} = require('../../utils/mobile_validator')
const { findUserByParams } = require('../../controllers/user')
const { createAndSendOTP } = require('../../controllers/verify_otp')
const passport = require('../../passport/passporthandler')

router.get('/login', cel.ensureNotLoggedIn('/'), (req, res, next) => {
  res.render('login', {
    pageTitle: 'Login',
    error: req.flash('error'),
  })
})

router.get('/signup', cel.ensureNotLoggedIn('/'), async (req, res, next) => {
  try {
    const [colleges, branches, countries] = await Promise.all([
      findAllColleges(),
      findAllBranches(),
      findAllCountries(),
    ])
    const prevForm = { ...req.session.prevForm }

    const verifiedRefCode = await findUserByParams({
      referralCode: req.query.refcode,
    })

    const gradYears = [
      2025,
      2024,
      2023,
      2022,
      2021,
      2020,
      2019,
      2018,
      2017,
      2016,
      2015,
      2014,
      2013,
      2012,
      2011,
      2010,
      2009,
      2008,
      2007,
      2006,
      2005,
      2004,
      2003,
      2002,
      2001,
      2000,
    ]

    // use the previous form only once
    delete req.session.prevForm

    res.render('signup', {
      pageTitle: 'Signup',
      colleges,
      branches,
      countries,
      prevForm,
      gradYears,
      // eslint-disable-next-line no-nested-ternary
      refCode: verifiedRefCode
        ? verifiedRefCode.get().referralCode
        : prevForm.refCode
        ? prevForm.refCode
        : null,
    })
  } catch (err) {
    Raven.captureException(err)
    res.flash('error', 'Error Fetching College and Branches Data.')
    res.redirect('/')
  }
})

router.get(
  '/forgot/password/new/:key',
  cel.ensureNotLoggedIn('/'),
  (req, res, next) => {
    // FIXME: Check if the key is correct, and prevent rendering if so
    res.render('forgot/password/new', {
      pageTitle: 'Set new Password',
      key: req.params.key,
    })
  }
)

router.get(
  '/verifyemail/inter',
  cel.ensureLoggedIn('/login'),
  (req, res, next) => {
    res.render('verifyemail/inter', {
      pageTitle: 'Verify Email',
    })
  }
)

router.get('/client/add', cel.ensureLoggedIn('/login'), (req, res, next) => {
  res.render('client/add', { pageTitle: 'Add New Client' })
})

router.get(
  '/organisation/add',
  cel.ensureLoggedIn('/login'),
  (req, res, next) => {
    res.render('/organisation/add', { pageTitle: 'Add New Organisation' })
  }
)

module.exports = router

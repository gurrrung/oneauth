/**
 * Created by championswimmer on 13/03/17.
 */
const router = require('express').Router()
const publicroute = require('./public')
const usersroute = require('./users')
const clientroute = require('./client')
const addressroute = require('./address')
const forgotroute = require('./forgot')
const approute = require('./apps')
const orgroute = require('./organisation')
const { makeGaEvent } = require('../../utils/ga')
const { pageLimiter } = require('../../middlewares/ratelimit')

router.use(pageLimiter)
router.use((req, res, next) => {
  // One '!' doesn't cancel the other'!'. This is not wrong code. Learn JS
  res.locals.loggedIn = !!req.user
  res.locals.userRole = req.user && req.user.role
  res.locals.userId = req.user && req.user.id
  res.locals.userName = req.user && req.user.firstname
  res.locals.userPhoto = req.user && req.user.photo
  res.locals.title = 'Coding Blocks Account'

  if (req.url.includes('address')) {
    res.locals.currentUrl = 'address'
  } else if (req.url.includes('organisations')) {
    res.locals.currentUrl = 'organisations'
  } else if (req.url.includes('apps')) {
    res.locals.currentUrl = 'apps'
  } else if (req.url.includes('clients')) {
    res.locals.currentUrl = 'clients'
  } else res.locals.currentUrl = 'users'

  next()
})

router.use('/', publicroute)
router.use('/users', usersroute)
router.use('/clients', clientroute)
router.use('/address', addressroute)
router.use('/forgot', forgotroute)
router.use('/apps', approute)
router.use('/organisations', orgroute)

module.exports = router

/**
 * Created by piyush0 on 23/04/17.
 */
const router = require('express').Router()
const Raven = require('raven')
const config = require('../../config')
const { makeGaEvent } = require('../utils/ga')

router.get('/', makeGaEvent('submit', 'form', 'logout'), (req, res) => {
  const redirectUrl =
    req.query.returnTo || req.query.redirect || req.session.returnTo || '/login'

  req.user = null
  req.logout()
  req.session.destroy((err) => {
    if (err) Raven.captureException(err)
    res.clearCookie('oneauth', {
      path: '/',
      domain: 'account.codingblocks.com',
      httpOnly: true,
    })
    res.clearCookie('oneauth', {
      path: '/',
      domain: config.COOKIE_DOMAIN,
      httpOnly: true,
    })
    res.redirect(redirectUrl)
  })
})

module.exports = router

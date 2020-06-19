/**
 * Created by tdevm on 06/01/20.
 */

const Raven = require('raven')
const router = require('express').Router()
const debug = require('debug')('oauth_using_otp:routes:api:top')

const { findUserById } = require('../../controllers/user')

const { createAndSendOTP } = require('../../controllers/verify_otp')
const {
  parseNumberByCountry,
  validateNumber,
} = require('../../utils/mobile_validator')

const passport = require('../../passport/passporthandler')
const { models } = require('../../db/models')

const { findUserByParams } = require('../../controllers/user')
const { validateUsername } = require('../../utils/username_validator')

router.post(
  '/',
  passport.authenticate(['basic', 'oauth2-client-password'], {
    session: false,
  }),
  async (req, res, next) => {
    try {
      let user
      if (req.body.username.startsWith('+')) {
        // username is being treated as mobile number
        const mobileCountry = await models.Country.findOne({
          where: {
            dial_code: req.body.username.substring(0, 3),
          },
        })

        if (
          !validateNumber(
            parseNumberByCountry(
              req.body.username.substring(3),
              mobileCountry ? mobileCountry.get().id : null
            )
          )
        ) {
          return res.status(400).json({ err: 'INVALID_MOBILE_NUMBER' })
        }

        user = await findUserByParams({ verifiedmobile: req.body.username })
      } else {
        // username is being treated as user id (pk)
        user = await findUserById(req.body.username)
      }

      if (!user) {
        debug(
          'Mobile no not verified or no user for OTP login via oauth2-client-password'
        )
        return res.status(403).json({ err: 'MOBILE_NOT_VERIFIED' })
      }

      const key = Math.floor(100000 + Math.random() * 900000) // creates a 6 digit random number.

      await models.UserMobileOTP.upsert({
        mobile_number: user.dataValues.mobile_number,
        login_otp: key,
        userId: user.dataValues.id,
        include: [models.User],
        clientId: req.user.id,
      })

      await createAndSendOTP(
        user.mobile_number,
        key,
        'accessing your Coding Blocks Account',
        req.user.androidOTPHash
      )
      res.status(204).send()
    } catch (error) {
      Raven.captureException(error)
      res.status(500).json({
        error: 'Failed to send an OTP for oauth2-client-password strategy',
      })
    }
  }
)

module.exports = router

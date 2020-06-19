/**
 * Created by championswimmer on 07/05/17.
 */
const Raven = require('raven')
const FacebookStrategy = require('passport-facebook').Strategy

const { models } = require('../../../db/models')

const config = require('../../../../config')

const secrets = config.SECRETS
const { generateReferralCode } = require('../../../utils/referral')

// const debug = require('debug')('oauth:strategy:facebook')

/**
 * This is to authenticate _users_ using their
 * Facebook accounts
 */

module.exports = new FacebookStrategy(
  {
    clientID: secrets.FB_CLIENT_ID,
    clientSecret: secrets.FB_CLIENT_SECRET,
    callbackURL: config.SERVER_URL + config.FACEBOOK_CALLBACK,
    profileFields: ['id', 'name', 'picture', 'email'],
    passReqToCallback: true,
  },
  async (req, authToken, refreshToken, profile, cb) => {
    const profileJson = profile._json
    const oldUser = req.user
    // DATADOG TRACE: START SPAN
    Raven.setContext({ extra: { file: 'fbstrategy' } })

    try {
      if (oldUser) {
        /*
            This means an already logged in users is trying to
            connect Facebook to his account. Let us see if there
            are any connections to his facebook already
             */
        const fbaccount = await models.UserFacebook.findOne({
          where: { id: profileJson.id },
        })

        if (fbaccount) {
          throw new Error(
            `Your Facebook account is already linked with codingblocks account Id: ${fbaccount.dataValues.userId}`
          )
        } else {
          await models.UserFacebook.upsert({
            id: profileJson.id,
            accessToken: authToken,
            refreshToken,
            photo: `https://graph.facebook.com/${profileJson.id}/picture?type=large`,
            userId: oldUser.id,
          })

          const user = await models.User.findById(oldUser.id)

          if (user) {
            user.update({
              photo: `https://graph.facebook.com/${profileJson.id}/picture?type=large`,
            })
            setImmediate(() => {
              span.addTags({
                resource: req.path,
                type: 'web',
                'span.kind': 'server',
                userId: oldUser.id,
                newUser: false,
                facebookId: profileJson.id,
              })
              span.finish()
            })
            return cb(null, user.get())
          }
          return cb(err, null, {
            message: 'Could not retrieve existing Twitter linked account',
          })
        }
      } else {
        /*
            This means either -
                a. This is a new signup via Facebook
                b. Someone is trying to login via Facebook
             */
        let userFacebook = await models.UserFacebook.findOne({
          include: [models.User],
          where: { id: profileJson.id },
        })
        /*
            if userFacebook exists then
            Case (a): Logging in
             */

        if (!userFacebook) {
          /*
                Case (b): New Signup
                First ensure there aren't already users with the same email
                id that comes from facebook
                 */
          let existingUsers = []
          if (profileJson.email) {
            existingUsers = await models.User.findAll({
              include: [
                {
                  model: models.UserFacebook,
                  attributes: ['id'],
                  required: false,
                },
              ],
              where: {
                email: profileJson.email,
                '$userfacebook.id$': { $eq: null },
              },
            })
          }

          if (existingUsers && existingUsers.length > 0) {
            const oldIds = existingUsers.map((eu) => eu.id).join(',')
            return cb(null, false, {
              message: `
                    Your email id "${profileJson.email}" is already used in the following Coding Blocks Account(s):
                    [ ${oldIds} ]
                    Please log into your old account and connect Facebook in it instead.
                    Use 'Forgot Password' option if you do not remember password of old account`,
            })
          }

          userFacebook = await models.UserFacebook.create(
            {
              id: profileJson.id,
              accessToken: authToken,
              refreshToken,
              photo: `https://graph.facebook.com/${profileJson.id}/picture?type=large`,
              user: {
                username: `${profileJson.first_name}-${profileJson.last_name}-${profileJson.id}`,
                firstname: profileJson.first_name,
                lastname: profileJson.last_name,
                email: profileJson.email,
                referralCode: generateReferralCode(
                  profileJson.email
                ).toUpperCase(),
                photo: `https://graph.facebook.com/${profileJson.id}/picture?type=large`,
                marketing_meta: req.session.marketingMeta,
              },
            },
            {
              include: [models.User],
            }
          )
          req.visitor
            .event({
              ea: 'successful',
              ec: 'signup',
              el: 'facebook',
            })
            .send()
          req.session.isNewSignup = true
          if (!userFacebook) {
            return cb(null, false, { message: 'Authentication Failed' })
          }
        }
        return cb(null, userFacebook.user.get())
      }
    } catch (err) {
      Raven.captureException(err)
      return cb(null, false, { message: err.message })
    }
  }
)

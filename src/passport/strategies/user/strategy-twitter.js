/**
 * Created by championswimmer on 07/05/17.
 */
const Raven = require('raven')
const TwitterStrategy = require('passport-twitter-email').Strategy
const debug = require('debug')('oauth:strategies:twitter')
const { models } = require('../../../db/models')

const config = require('../../../../config')

const secrets = config.SECRETS
const { generateReferralCode } = require('../../../utils/referral')

/**
 * Authenticate _users_ using their Twitter accounts
 */

module.exports = new TwitterStrategy(
  {
    consumerKey: secrets.TWITTER_CONSUMER_KEY,
    consumerSecret: secrets.TWITTER_CONSUMER_SECRET,
    callbackURL: config.SERVER_URL + config.TWITTER_CALLBACK,
    passReqToCallback: true,
  },
  async (req, token, tokenSecret, profile, cb) => {
    const profileJson = profile._json
    const oldUser = req.user
    Raven.setContext({ extra: { file: 'twitterstrategy' } })

    try {
      if (oldUser) {
        debug('User exists, is connecting Twitter account')
        /*
            This means an already logged in users is trying to
            connect Google to his account. Let us see if there
            are any connections to his Google already
            */
        const twaccount = await models.UserTwitter.findOne({
          where: { id: profileJson.id },
        })
        if (twaccount) {
          throw new Error(
            `Your Twitter account is already linked with coding blocks account Id: ${twaccount.dataValues.userId}`
          )
        } else {
          await models.UserTwitter.upsert({
            id: profileJson.id,
            token,
            tokenSecret,
            username: profileJson.screen_name,
            userId: oldUser.id,
          })
          const user = await models.User.findById(oldUser.id)
          if (user) {
            return cb(null, user.get())
          }
          return cb(null, false, {
            message: 'Could not retrieve existing Twitter linked account',
          })
        }
      } else {
        /*
         *   This means either -
         *       a. This is a new signup via Google
         *       b. Someone is trying to login via Google
         */

        let userTwitter = await models.UserTwitter.findOne({
          include: [models.User],
          where: { id: profileJson.id },
        })
        /*
         *  If userTwitter exists then
         *  Case (a): login
         */

        if (!userTwitter) {
          /*
           *   Case (b): New Signup
           *   First ensure there aren't already users with the same email
           *   id that comes from Google
           */
          let existingUsers = []
          if (profileJson.email) {
            existingUsers = await models.User.findAll({
              include: [
                {
                  model: models.UserTwitter,
                  attributes: ['id'],
                  required: false,
                },
              ],
              where: {
                email: profileJson.email,
                '$usertwitter.id$': { $eq: null },
              },
            })
          }

          if (existingUsers && existingUsers.length > 0) {
            const oldIds = existingUsers.map((eu) => eu.id).join(',')
            return cb(null, false, {
              message: `
                    Your email id "${profileJson.email}" is already used in the following Coding Blocks Account(s):
                    [ ${oldIds} ]
                    Please log into your old account and connect Twitter in it instead.
                    Use 'Forgot Password' option if you do not remember password of old account`,
            })
          }

          /*
           * Check if any user with same username exists, if yes
           * we use a `username-t` policy
           */
          const existCount = await models.User.count({
            where: { username: profileJson.screen_name },
          })
          userTwitter = await models.UserTwitter.create(
            {
              id: profileJson.id,
              token,
              tokenSecret,
              username: profileJson.screen_name,
              user: {
                username:
                  existCount === 0
                    ? profileJson.screen_name
                    : `${profileJson.screen_name}-t`,
                firstname: profileJson.name.split(' ')[0],
                lastname: profileJson.name.split(' ').pop(),
                email: profileJson.email || undefined,
                referralCode: generateReferralCode(
                  profileJson.email || profileJson.screen_name
                ).toUpperCase(),
                photo: profileJson.profile_image_url_https.replace(
                  '_normal',
                  '_400x400'
                ),
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
              el: 'twitter',
            })
            .send()

          req.session.isNewSignup = true

          if (!userTwitter) {
            return cb(null, false, { message: 'Authentication Failed' })
          }
        }
        return cb(null, userTwitter.user.get())
      }
    } catch (err) {
      Raven.captureException(err)
      cb(null, false, { message: err.message })
    }
  }
)

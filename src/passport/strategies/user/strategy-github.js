/**
 * Created by championswimmer on 07/05/17.
 */
const Raven = require('raven')
const GithubStrategy = require('passport-github2').Strategy
const debug = require('debug')('oauth:strategies:github')
const { models } = require('../../../db/models')

const config = require('../../../../config')

const secrets = config.SECRETS
const { generateReferralCode } = require('../../../utils/referral')

/**
 * Authenticate _users_ using their Github Accounts
 */

module.exports = new GithubStrategy(
  {
    clientID: secrets.GITHUB_CONSUMER_KEY,
    clientSecret: secrets.GITHUB_CONSUMER_SECRET,
    callbackURL: config.SERVER_URL + config.GITHUB_CALLBACK,
    passReqToCallback: true,
  },
  async (req, token, tokenSecret, profile, cb) => {
    const profileJson = profile._json
    const oldUser = req.user
    Raven.setContext({ extra: { file: 'githubstrategy' } })
    try {
      if (oldUser) {
        debug('User exists, is connecting Github account')
        /*
            This means an already logged in users is trying to
            connect Github to his account. Let us see if there
            are any connections to his Github already
            */

        const ghaccount = await models.UserGithub.findOne({
          where: { id: profileJson.id },
        })
        if (ghaccount) {
          throw new Error(
            `Your Github account is already linked with codingblocks account Id: ${ghaccount.dataValues.userId}`
          )
        } else {
          await models.UserGithub.upsert({
            id: profileJson.id,
            token,
            tokenSecret,
            username: profileJson.login,
            userId: oldUser.id,
          })

          const user = await models.User.findById(oldUser.id)

          if (user) {
            return cb(null, user.get())
          }
          return cb(null, false, {
            message: 'Could not retrieve existing Github linked account',
          })
        }
      } else {
        /*
            This means either -
                a. This is a new signup via Github
                b. Someone is trying to login via Github
             */
        let userGithub = await models.UserGithub.findOne({
          include: [models.User],
          where: { id: profileJson.id },
        })
        /*
            If userGithub exists then
            Case (a): login
             */
        if (!userGithub) {
          /*
                Case (b): New Signup
                First ensure there aren't already users with the same email
                id that comes from Github
                 */
          let existingUsers = []
          if (profileJson.email) {
            existingUsers = await models.User.findAll({
              include: [
                {
                  model: models.UserGithub,
                  attributes: ['id'],
                  required: false,
                },
              ],
              where: {
                email: profileJson.email,
                '$usergithub.id$': { $eq: null },
              },
            })
          }

          if (existingUsers && existingUsers.length > 0) {
            const oldIds = existingUsers.map((eu) => eu.id).join(',')
            return cb(null, false, {
              message: `
                    Your email id "${profileJson.email}" is already used in the following Coding Blocks Account(s):
                    [ ${oldIds} ]
                    Please log into your old account and connect Github in it instead.
                    Use 'Forgot Password' option if you do not remember password of old account`,
            })
          }

          /* Check if users with same username exist. Modify username accordingly */
          const existCount = await models.User.count({
            where: { username: profileJson.login },
          })

          userGithub = await models.UserGithub.create(
            {
              id: profileJson.id,
              token,
              tokenSecret,
              username: profileJson.login,
              user: {
                username:
                  existCount === 0
                    ? profileJson.login
                    : `${profileJson.login}-gh`,
                firstname: profileJson.name
                  ? profileJson.name.split(' ')[0]
                  : profileJson.login,
                lastname: profileJson.name
                  ? profileJson.name.split(' ').pop()
                  : profileJson.login,
                email: profileJson.email,
                referralCode: generateReferralCode(
                  profileJson.email
                ).toUpperCase(),
                photo: profileJson.avatar_url,
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
              el: 'github',
            })
            .send()

          req.session.isNewSignup = true

          if (!userGithub) {
            return cb(null, false, { message: 'Authentication Failed' })
          }
        }

        return cb(null, userGithub.user.get())
      }
    } catch (err) {
      Raven.captureException(err)
      cb(null, false, { message: err.message })
    }
  }
)

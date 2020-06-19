/**
 * @author championswimmer 2018-10-25
 */

const uid = require('uid2')
const Raven = require('raven')

const { Verifyemail, User } = require('../db/models').models
const mail = require('../utils/email')

/**
 * create a verify email entry and (optionally) send email
 * @param user {User}
 * @param [sendEmail] {boolean}
 * @param returnTo {string} URL to return to when verify link is hit
 * @returns {Verifyemail}
 */
async function createVerifyEmailEntry(user, sendEmail = false, returnTo) {
  const uniqueKey = uid(15)

  const verifyEntry = await Verifyemail.create({
    key: uniqueKey,
    userId: user.dataValues.id,
    returnTo,
    include: [User],
  })

  if (sendEmail) {
    mail
      .verifyEmail(user.dataValues, verifyEntry.key)
      .then(() => {
        // console.log('Mail sent')
      })
      .catch((err) => {
        Raven.captureException(err)
      })
  }

  return verifyEntry
}

/**
 * find verify entry with key
 * @param key
 * @returns {Promise<Verifyemail>}
 */
function findVerifyEmailEntryByKey(key) {
  return Verifyemail.findOne({
    where: { key },
  })
}

module.exports = {
  createVerifyEmailEntry,
  findVerifyEmailEntryByKey,
}

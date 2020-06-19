/**
 * Created by  Tridev on 01-02-2019.
 */

const request = require('request')
const secrets = require('../../secrets')
const { VerifyMobile, User } = require('../db/models').models

const createAndSendOTP = function (
  mobile_number,
  otp,
  otp_purpose,
  otpHash = ''
) {
  const messageText =
    otpHash === ''
      ? `${otp} is the OTP for ${otp_purpose} valid for 10 mins. Do not share it with anyone.`
      : `<#> ${otp} is the OTP for ${otp_purpose} valid for 10 mins. Do not share it with anyone. ${otpHash}`

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      url: 'http://sms.smscollection.com/sendsmsv2.asp',
      qs: {
        user: secrets.MOBILE_VERIFY_USERNAME,
        password: secrets.MOBILE_VERIFY_PASS,
        sender: 'CDGBLK',
        text: messageText,
        PhoneNumber: mobile_number.replace('+', '').replace('-', ''),
      },
    }
    request(options, (error, response, body) => {
      if (error) {
        // throw new Error(error)
        reject(error)
      } else {
        resolve(body)
      }
    })
  })
}

module.exports = {
  createAndSendOTP,
}

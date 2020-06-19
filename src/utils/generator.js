/**
 * Created by championswimmer on 10/03/17.
 */
const uid2 = require('uid2')

module.exports = {
  genNdigitNum(N) {
    // eslint-disable-next-line no-restricted-properties
    return parseInt(Math.random() * Math.pow(10, N), 10)
  },
  genNcharAlphaNum(N) {
    return uid2(N)
  },
}

const hbs = require('express-hbs')
const debug = require('debug')('oauth:utils:handlebars')

hbs.registerHelper('ifneq', function (options) {
  return options.hash.expected !== options.hash.val
    ? options.fn(this)
    : options.inverse(this)
})
hbs.registerHelper('ifeq', function (options) {
  debug('ifeq ---------- ')
  debug(options.hash)
  return options.hash.expected === options.hash.val
    ? options.fn(this)
    : options.inverse(this)
})
hbs.registerHelper('formatDate', (date) => {
  debug(date)
  const dateObject = new Date(date)
  const day = dateObject.getDate()
  const month = `0${dateObject.getMonth() + 1}`.slice(-2)
  const year = dateObject.getFullYear()
  const dateString = `${day}/${month}/${year}`
  return dateString
})

hbs.registerHelper('for', (from, to, incr, block) => {
  let accum = ''
  for (let i = from; i <= to; i += incr) accum += block.fn(i)
  return accum
})

hbs.registerHelper('ifCond', function (...args) {
  const options = args.pop()
  return args.some((x) => !x) ? options.fn(this) : options.inverse(this)
})

hbs.registerHelper('log', (obj) => JSON.stringify(obj))

const router = require('express').Router()
const seq = require('../db/models.js')

router.get('/', (req, res, next) => {
  seq.db
    .authenticate()
    .then(() => {
      res.send({
        postgres: 'Connected',
      })
    })
    .catch((err) => {
      res.send({
        postgres: 'Not Connected',
      })
    })
})

module.exports = router

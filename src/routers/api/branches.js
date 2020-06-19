const router = require('express').Router()
const controller = require('../../controllers/branches')

router.get('/', (req, res) => {
  controller.getAllBranches(req).then((result) => res.json(result))
})

module.exports = router

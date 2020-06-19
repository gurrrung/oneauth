const { models } = require('../../db/models')

function DisconnectGoogle(req, res) {
  const existingUser = req.user

  if (!existingUser) {
    res.redirect('/')
  } else {
    models.UserGoogle.destroy({
      where: { userId: req.user.id },
    })
      .then((result) => res.redirect('/users/me'))
      .catch((err) => {
        Raven.captureException(err)
        res
          .status(503)
          .send({ message: 'There was an error disconnecting Google.' })
      })
  }
}

module.exports = DisconnectGoogle

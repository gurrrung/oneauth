const { models } = require('../../db/models')

function DisconnectLinkedin(req, res) {
  const existingUser = req.user

  if (!existingUser) {
    req.flash('error', "Account doesn't exist.")
    res.redirect('/')
  } else {
    models.UserLinkedin.destroy({
      where: { userId: req.user.id },
    })
      .then((result) => res.redirect('/users/me'))
      .catch((err) => {
        Raven.captureException(err)
        res
          .status(503)
          .send({ message: 'There was an error disconnecting Linkedin.' })
      })
  }
}
module.exports = DisconnectLinkedin

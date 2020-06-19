/**
 * Created by himank on 24/11/17.
 */
const { models } = require('../../db/models')

function DisconnectGithub(req, res) {
  const existingUser = req.user

  if (!existingUser) {
    res.redirect('/')
  } else {
    models.UserGithub.destroy({
      where: { userId: req.user.id },
    })
      .then((result) => res.redirect('/users/me'))
      .catch((err) => {
        Raven.captureException(err)
        res
          .status(503)
          .send({ message: 'There was an error disconnecting Github.' })
      })
  }
}

module.exports = DisconnectGithub

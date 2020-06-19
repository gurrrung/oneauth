const Raven = require('raven')
const multer = require('../utils/multer')

function profilePhotoMiddleware(req, res, next) {
  if (req.originalUrl.indexOf('users/me/edit') === -1) {
    // If not editing profile, this middleware is useless
    return next()
  }
  const upload = multer.upload.single('userpic')
  upload(req, res, (err) => {
    if (err) {
      if (err.message === 'File too large') {
        req.flash('error', 'Profile photo size exceeds 2 MB')
        return res.redirect('/users/me/edit')
      }
      if (err.message === 'Photo Upload Exeption') {
        req.flash(
          'error',
          'Error uploading photo :( Try one of the avatars for now ??'
        )
        return res.redirect('/users/me/edit')
      }
      Raven.captureException(err)
      req.flash('error', 'Error in Server')
      return res.redirect('/')
    }
    next()
  })
}

module.exports = {
  profilePhotoMiddleware,
}

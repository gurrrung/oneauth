/* eslint-disable consistent-return */
/* eslint-disable func-names */
/**
 * Created by championswimmer on 08/03/17.
 */
require('newrelic')
const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const path = require('path')
const exphbs = require('express-hbs')
const cookieParser = require('cookie-parser')
const expressGa = require('express-universal-analytics')
const flash = require('express-flash')
const Raven = require('raven')
const debug = require('debug')('oneauth:server')
const passport = require('./passport/passporthandler')

const config = require('../config')

const secrets = config.SECRETS
const { sessionStore, saveIp } = require('./middlewares/sessionstore')
const { redirectToEditProfile } = require('./middlewares/profilevalidation')
const loginrouter = require('./routers/login')
const connectrouter = require('./routers/connect')
const disconnectrouter = require('./routers/disconnect')
const logoutrouter = require('./routers/logoutrouter')
const signuprouter = require('./routers/signup')
const verifyemailrouter = require('./routers/verifyemail')
const verifymobilerouter = require('./routers/verifymobile')
const apirouter = require('./routers/api')
const oauthrouter = require('./routers/oauthrouter')
const pagerouter = require('./routers/pages')
const statusrouter = require('./routers/statusrouter')
const { expresstracer, datadogRouter } = require('./utils/ddtracer')
const { expressLogger } = require('./utils/logger')
const {
  setuserContextRaven,
  triggerGApageView,
  setUtmParamsInGa,
} = require('./middlewares/analytics')
const { profilePhotoMiddleware } = require('./middlewares/profilephoto')

const app = express()

app.set('trust proxy', 'loopback, linklocal, uniquelocal')

// ============== START DATADOG
app.use(expresstracer)
// ================= END DATADOG
const redirectToHome = function (req, res, next) {
  if (req.path === '/') {
    return res.redirect('/users/me')
  }

  next()
}

// ====================== START SENTRY
Raven.config(secrets.SENTRY_DSN).install()
app.use(Raven.requestHandler())
// ====================== END SENTRY

// ====================== Handlebars Config
app.engine(
  'hbs',
  exphbs.express4({
    partialsDir: path.join(__dirname, '../views/partials'),
    layoutsDir: path.join(__dirname, '../views/layouts'),
    defaultLayout: 'views/layouts/main.hbs',
  })
)
app.set('views', path.join(__dirname, '../views'))
app.set('view engine', 'hbs')
app.set('view cache', true)
// ====================== Handlebars Config

app.use('/status', statusrouter)
app.use(expressLogger)
app.use(express.static(path.join(__dirname, '../public_static')))
app.use(
  express.static(path.join(__dirname, '../submodules/motley/examples/public'))
)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(
  session({
    store: sessionStore,
    secret: secrets.EXPRESS_SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    name: 'oneauth',
    cookie: {
      domain: config.COOKIE_DOMAIN,
      secure: false,
      maxAge: 86400000,
      sameSite: 'lax',
    },
  })
)
app.use(saveIp)
app.use(flash())
app.use(passport.initialize())
app.use(passport.session())
app.use(setuserContextRaven)
app.use(redirectToHome)
app.use(datadogRouter)
app.use(
  expressGa({
    uaCode: 'UA-83327907-12',
    autoTrackPages: false,
    cookieName: '_ga',
    reqToUserId: (req) => req.user && req.user.id,
  })
)
app.use(setUtmParamsInGa)
app.use('/api', apirouter)
app.use(profilePhotoMiddleware)
app.use(triggerGApageView)
app.use('/oauth', oauthrouter)
app.use('/verifyemail', verifyemailrouter)
// app.use(csurf({cookie: false}))
app.use((req, res, next) => {
  res.locals.csrfToken = '' // req.csrfToken() // Inject csrf to hbs views
  next()
})
app.use('/verifymobile', verifymobilerouter)
app.use('/logout', logoutrouter)
app.use('/signup', signuprouter)
app.use('/login', loginrouter)
app.use(redirectToEditProfile)
app.use('/disconnect', disconnectrouter)
app.use('/connect', connectrouter)
app.use('/', pagerouter)
app.get('*', (req, res) => res.render('404'))

app.use(Raven.errorHandler())

if (process.env.ONEAUTH_DEV === 'localhost') {
  // eslint-disable-next-line no-console
  Raven.captureException = (E) => console.error(E)
}

app.listen(process.env.PORT || 3838, () => {
  debug(`Listening on ${config.SERVER_URL}`)
})

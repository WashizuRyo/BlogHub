const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('passport');
const csurf = require('tiny-csrf');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] });

const GitHubStrategy = require('passport-github2').Strategy;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Ov23li38uYCKE3BmXJuT';
const GITHUB_CLIENT_SECRET =process.env.GITHUB_CLIENT_SECRET || '0cfbecb87277fdef6b666bcc649c8530bb28a975';

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL || 'http://localhost:8000/auth/github/callback'
},
  (accessToken, refreshToken, profile, done) => {
    process.nextTick(async () => {
      const userId = parseInt(profile.id);

      const data = {
        userId,
        username: profile.username
      }

      await prisma.user.upsert({
        where: { userId }, 
        create: data,
        update: data
      });

      done(null, profile)
    });
  }
));

const indexRouter = require('./routes/index');
const loginRouter = require('./routes/login');
const logoutRouter = require('./routes/logout');
const blogsRouter = require('./routes/blogs');
const commentRouter = require('./routes/comments');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser('BlogHub_signed_cookies'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet());

app.use(session({ secret: '417cce55dfafa4577454', resave: false, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

app.use(
  csurf(
    'nyobikosecretsecret9876543212367',
    ['POST'],
    [/blogs\/([^\/]+)\/users\/([^\/]+)\/comments\/([^\/]+)/]
  )
);

app.use('/', indexRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/blogs', blogsRouter);
app.use('/blogs', commentRouter);

app.get(
  '/auth/github', 
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get(
  '/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    const loginFrom = req.cookies.loginFrom;
    //オープンリダイレクト脆弱性対策
    if (loginFrom && loginFrom.startsWith('/')) {
      res.clearCookie('loginFrom')
      res.redirect(loginFrom);
    } else {
      res.redirect('/');
    }
  }
);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

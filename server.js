//configure dependencies
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var morgan = require('morgan');
var User = require('./models/user');
var hbs = require('express-handlebars');
var path = require('path');
var app = express();
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
// initialize express-session to allow us track user session.
const oneDayToSeconds = 24 * 60 * 60;
app.use(session({
  key: 'user_sid',
  secret: 'kanapka123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: 24 * 60 * 60 * 1000
  }
}));
// handle bars config
app.engine('hbs', hbs({extname: 'hbs',defaultLayout: 'layout', layoutsDir: __dirname + '/views/layouts'}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');




// This middleware will check if user's cookie is still saved in browser
app.use((req, res, next) => {
  if (req.cookies.user_sid && !req.session.user) {
    res.clearCookie('user_sid');
  }
  next();
});

// middleware function to check for logged-in users
var sessionChecker = (req, res, next) => {
  if (req.session.user && req.cookies.user_sid) {
    res.redirect('/dashboard');
  } else {
    next();
  }
};



//set default page content if no user is logged in
var hbsContent = {userName: '', loggedin: false, title: "You are not logged in today", body: "Hello World"};

// route for Home-Page
app.get('/', sessionChecker, (req, res) => {
  res.redirect('/login');
});

// route for user signup
app.route('/signup')
  .get((req, res) => {
    res.render('signup', hbsContent);
  })//insert user into db
  .post((req, res) => {
    User.create({
      username: req.body.username,
      password: req.body.password
      })
      .then(user => {
        req.session.user = user.dataValues;
        res.redirect('/dashboard');
      })
      .catch(error => {
        res.redirect('/signup');
      });
  });

// route for user Login
app.route('/login')
  .get(sessionChecker, (req, res) => {
    res.render('login', hbsContent);
  })
  .post((req, res) => {
    var username = req.body.username,
    password = req.body.password;

    User.findOne({ where: { username: username } }).then(function (user) {
      if (!user) {
        res.redirect('/login');
      } else if (!user.validPassword(password)) {
        res.redirect('/login');
      } else {
        req.session.user = user.dataValues;
        res.redirect('/dashboard');
      }
    });
  });

// route for user's dashboard
app.get('/dashboard', (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
    //configure user page content while logged in
    hbsContent.loggedin = true;
    hbsContent.userName = req.session.user.username;
    hbsContent.title = "You are logged in";
    res.render('index', hbsContent);
  } else {
    res.redirect('/login');
  }
});

// route for user logout
app.get('/logout', (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
    //set user page content back to default and remove cookie.
    hbsContent.loggedin = false;
		hbsContent.title = "You are logged out!";
    res.clearCookie('user_sid');
    console.log(JSON.stringify(hbsContent));
    res.redirect('/');
  } else {
    res.redirect('/login');
  }
});


// route for handling 404 requests(unavailable routes)
app.use(function (req, res, next) {
  res.status(404).send("It looks like you reached our beloved 404. You know what to do.")
});

//port listener
const server = app.listen(3000, () => {
  console.log(`Express running → PORT ${server.address().port}`);
});

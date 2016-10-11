var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
app.use(session({secret: 'lola', resave: false, saveUninitialized: true, loggedIn: false}));
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res) {


  if (req.session.loggedIn === true) {
    console.log('logged in');
    res.render('index');
  } else {
    console.log('not logged in, redirecting');
    res.redirect('login');
  }

});

app.get('/create', 
function(req, res) {

  if (req.session.loggedIn === true) {
    res.render('index');
  } else {
    res.redirect('login');
  }
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  // res.render('login');

  new User({username: req.body.username})
    .fetch()
    .then(function(model) {
      if (!model) {
        console.log('invalid username')
        res.redirect('login');
        res.status(404);
      } else {
        // console.log('model pw', model.get('password'), req.body.password);
        if (req.body.password === model.get('password')) {
          req.session.loggedIn = true;
          console.log('success pw matches', req.session, req.session.loggedIn)
          res.redirect('index');
        } else {
          console.log('fail pw no match')
          res.redirect('login');
          res.status(403);
        }
      }
    });
});




app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  // res.render('signup');
  new User({username: req.body.username})
    .fetch()
    .then(function(model) {
      if (model) {
        //username already exists
        res.redirect('signup');
      } else {
        Users.create(req.body).then(function(newUser) {
          req.session.loggedIn = true;
          res.set('location', '/')
          res.status(201).redirect('index');
        });
      }
    }); 
});

app.get('/logout', function(req, res) {
  req.session.reset();
  res.redirect('/login');
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);

//dependencies for each module used
var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var path = require('path');
var handlebars = require('express3-handlebars');
var fs = require('fs');
var spotify = require('spotify-node-applescript');
var chatServer = require('./chatServer')(http);


var passport = require('passport');
var SpotifyStrategy = require('passport-spotify').Strategy;
var dotenv = require('dotenv');
dotenv.load();


var app = express();
//route files to load
var index = require('./routes/index');

//global variable, don't judge
var skipButton = 0;
var gbaccesstoken = "";

//passport, spotify login
//serialize and deserialize (for persistent sessions)
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findOne( { id: id }, function (err, user) {
        done(err, user);
    });
})

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}

passport.use(new SpotifyStrategy({
    clientID: process.env.SPOTIFYCLIENTID,
    clientSecret: process.env.SPOTIFYCLIENTSECRET,
    callbackURL: "http://10.16.189.76:2014/auth/spotify/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        process.nextTick(function() {
            gbaccesstoken = accessToken;
            console.log(gbaccesstoken);
            return done(null, profile);
        });
    }));


//Configures the Template engine
app.set('port', process.env.PORT || 2014);
app.use(express.methodOverride());
app.engine('handlebars', handlebars());
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());
app.use(passport.initialize());
app.use(express.session({ secret: 'feed me' }));
app.use(passport.session());

//login feature
app.get('/login', index.view);
//routes
app.get('/', index.view);



app.get('/auth/spotify',
    passport.authenticate('spotify', {scope: 'user-read-email'}),
    function(req, res) {
        //YOU SHOULD NEVER GET HERE
        console.log("What the fuck?");
    });

app.get('/auth/spotify/callback',
    passport.authenticate('spotify', { failureRedirect: '/login' }),
    function(req, res) {
        res.redirect('/');
    });

app.get ('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});
//Return metadata
app.get('/metadata', function(req, res) {
  spotify.getTrack(function (err, track) {
    if (err) {
        return console.error(err);
    }
        console.log(track);
        res.json(track);
    });
});


//Return image artwork
app.get('/artwork', function(req, res) {
    spotify.getArtwork(function(err, artwork) {
            if (err) {
                return console.error(err);
            }
            fs.readFile(artwork, function(error, data) {
                if (error) {
                    throw error;
                }
                res.writeHead(200, {'Content-Type': 'image/jpeg' });
                res.end(data);
            });
    });
});

//Skip button
app.get('/skip', function(req, res) {
    skipButton++;
    console.log(skipButton);
    if ((skipButton % 5) == 0) {
        console.log("HIT");
        skipButton = 0;
        spotify.next(function(err) { 
            if (err) {
                console.log(err);
            }
        });
    }
    res.redirect('/');
});

//move files to node directory
function copyFile(source, target, callback) {
    var cbCalled = false;
    var read = fs.createReadStream(source);
    read.on("error", function(err) {
            done(err);
            });
    var write = fs.createWriteStream(target);
    write.on("error", function(err) {
            done(err);
            })
    read.pipe(write);
    //sets error message
    function done(err) {
        if (!cbCalled) {
            callback(err);
            cbCalled = true;
        }
    }
}

app.post('/sendTrack', ensureAuthenticated, function(req, res) {
    console.log("track id is: " + req.body.id);
     
});

//set environment ports and start application

http.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


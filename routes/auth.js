var express = require("express");
var app = express();
var router = express.Router();
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var bcrypt   = require("bcrypt-nodejs");


// DATABASE MODEL
var User = require("../models/user.js");

// LOG TIME
router.use(function (req, res, next){
	console.log("AUTH: ", Date.now());
	next();
});

// PASSPORT
passport.use(new LocalStrategy({usernameField: "email"},
	function(email, password, done){
		console.log("Local Auth Strategy Init");
		User.findOne({where:{email: email}}).then(function (user){
			if (!user){
				console.log("Local Auth Strategy Failed: No user found");
				return done(null, false, {message: "Incorrect username"});
			}
			console.log("Database query finished. Checking data");
			if (!bcrypt.compareSync(password, user.password)) {
				console.log("Local Auth Strategy Failed: Password Mismatch");
				return done(null, false, {message: "Incorrect password"});
			}
			console.log("User authenticated");
			return done(null, user);
		});
	}
));

// ROUTES

	// SIGNUP
router.route("/signup")
	// serves up static signup page
	.get(function (req,res){
		console.log("GET: /signup : Getting signup page");
		if (req.user){
			console.log("User session found. Invoke error");
			req.flash("error", "Already signed in!");
			res.redirect("/"); // give error in future
		} else {
			// following code is to pre populate the signup page
			res.render("auth/signup",{
				title: "Leafii - Sign Up",
				error: req.flash("error")[0],
				user: req.session.user
			});
		}
	})
	// records new signup
	// requires: user session is undefined
	.post(function (req, res){
		console.log("POST: /signup : Recording Signup");
		
		// upon failed attempt at form, we prefill the form with session vars
		req.session.user = {
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			email: req.body.email,
			url: req.body.url,
			location: req.body.location
		};

		if (req.user){
			console.log("User session found. Invoke error");
			req.flash("error", "can not be signed in!"); // CHANGE THIS TO PROPERLY RESPOND
			res.redirect("/")
		} else if (req.body.password != req.body.confirm){
			console.log("Passwords mismatch. Invoke error");
			req.flash("error", "passwords do not match"); // CHANGE THIS TO PROPERLY RESPOND
			res.redirect("/auth/signup")
		} else if (req.body.username == "" || req.body.password == "") {
			console.log("Required fields blank. Invoke error");
			req.flash("error", "required fields can not be blank"); // CHANGE THIS TO PROPERLY RESPOND
			res.redirect("/auth/signup")
		} else {
			console.log("Parameters all good. Proceed to record in database")
			User.sync().then(function (){
				req.body.password = bcrypt.hashSync(req.body.password);
				User.create(req.body).then(function (user){
					delete req.session.user; // delete the form prefiller
					console.log("Successfully recorded user in database");
					console.dir(user.get());
					req.flash("success", "Sign up successful. please sign in!");
					res.redirect("/thankyou")
				}).catch(function (err){
					console.log("Unsuccessful in recording user in database");
					console.dir(err)
					req.flash("error", err.errors[0].message);
					res.redirect("/auth/signup");
				});
			});
		}
	});

	// SIGNIN
router.route("/signin")
	// servers up static signin page
	// requires: user session is undefined
	.get(function (req, res){
		console.log("GET: /signin : Getting signin page");
		if (req.user) { 
			console.log("User session found. Redirecting to user page");
			req.flash("error", "Already signed in!")
			res.redirect("/"); // give success in future
		} else {
			delete req.session.email;
			console.log("User session not found. Continue to signin page");
			res.render("auth/signin",{
				title: "Leafii - Sign In",
				error: req.flash("error")[0],
				email: req.body.email

			});
		}
	})
	// authenticated user
	.post(function(req, res, next){
		req.session.email = req.body.email;
		console.log("POST: /signin : Authenticating user");
		next();
	},passport.authenticate("local", {
			successRedirect: "/auth/profile",
			failureRedirect: "/auth/signin",
			failureFlash: true
			// failureFlash: "Invalid username or password."
	}));

	// SIGNOUT
router
	// signs out user
	.all("/signout",function(req, res){
		console.log("ANY: /signout : Signing out user");
		req.logout();
		console.log("Redirecting to landing page");
		req.flash("success", "Successfully signed out!")
		res.redirect("/");
	});

	// ADMIN OF USER
router.route("/profile")
	// serves up static profile page
	// requires: user session to exist
	.get(function (req, res){
		console.log("GET: /profile : Getting profile page");
		if (!req.user) { 
			console.log("User session not found. Redirecting to signin page");
			return res.redirect("/auth/signin");
		} else {
			console.log("User session found. Continue to profile page");
			res.render("auth/profile",{
				user: req.user
			})
		}
	})
	.post(function(req,res){
		console.log("POST: /profile : Updating profile");
		res.send("not ready yet");
	});


//Verification
// router.get('/send',function(req,res){
//         rand=Math.floor((Math.random() * 100) + 54);
//     host=req.get('host');
//     link="http://"+req.get('host')+"/verify?id="+rand;
//     mailOptions={
//         to : req.query.to,
//         subject : "Please confirm your Email account",
//         html : "Hello,<br> Please Click on the link to verify your email.<br><a href="+link+">Click here to verify</a>"
//     }
//     console.log(mailOptions);
//     smtpTransport.sendMail(mailOptions, function(error, response){
//      if(error){
//             console.log(error);
//         res.end("error");
//      }else{
//             console.log("Message sent: " + response.message);
//         res.end("sent");
//          }
// 	});
// });

// router.get('/verify',function(req,res){
// 	console.log(req.protocol+":/"+req.get('host'));
// 	if((req.protocol+"://"+req.get('host'))==("http://"+host))
// 	{
// 	    console.log("Domain is matched. Information is from Authentic email");
// 	    if(req.query.id==rand)
// 	    {
// 	        console.log("email is verified");
// 	        res.end("<h1>Email "+mailOptions.to+" is been Successfully verified");
// 	    }
// 	    else
// 	    {
// 	        console.log("email is not verified");
// 	        res.end("<h1>Bad Request</h1>");
// 	    }
// 	}
// 	else
// 	{
// 	    res.end("<h1>Request is from unknown source");
// 	}
// });

module.exports = router;
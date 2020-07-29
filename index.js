const mongoose = require("mongoose")
const express = require("express");
const passport = require("passport");
const session = require("express-session");
const async = require("async");
const nodemailer = require("nodemailer");
const crypto=require("crypto");
const bodyParser = require("body-parser");
const Product = require("./models/Product");
const User = require("./models/User");
const {Cart, convertItems} = require("./models/Cart")
const userRoutes = require("./routes/userRoutes");
const MongoStore = require("connect-mongo")(session)
const app = require("https-localhost")()
const stripe = require('stripe')('sk_test_xc7N8Fh5Z2RKt57RPhlo1kz100M8CxZnkw');
require("dotenv").config();
app.use(express.urlencoded({
    extended: true
}));
app.set("view engine", "ejs");
app.use(express.static('public'));

//Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, err => {
    if (!err) {
        console.log("Database connected");
    } else {
        console.log(err);
    }
});
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
        mongooseConnection: mongoose.connection
    }),
    cookie: {
        maxAge: 180 * 60 * 1000
    }
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(User.createStrategy())
passport.serializeUser(function (user, done) {
    done(null, {
        _id: user.id,
        role: user.role
    });
});
passport.deserializeUser(function (sessionUser, done) {
    done(null, sessionUser);
});
app.use(userRoutes);
app.use(function (req, res, next) {
    res.locals.user = req.user;
    next();
});


app.get("/", (req, res) => {
    Product.find({}, (err, products) => {
        if (err) {
            res.send(err)
        } else {
            res.render("home_test", {
                products: products
            });
        }
    })
})
app.get("/upload", (req, res) => {
    res.render("productupload")
});
app.post("/upload", (req, res) => {
    const product = new Product(req.body);
    product.save((err) => {
        if (!err) {
            console.log("Successfully saved to database")
            res.redirect("/");
        } else {
            res.send(err);
        }
    })
});
app.get("/cart", async (req, res) => {
    cartItems = req.session.cartitems
    if(cartItems===undefined){
      res.send("Please add something to cart")
  }
  if(Object.keys(cartItems).length!== 0){
    const [transformedItems,totalPrice] = convertItems(cartItems)
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: transformedItems,
        success_url: 'https://localhost:8080/success',
        cancel_url: 'https://example.com/cancel',
    });
    let items = req.session.cartitems;
    res.render("cart", {
        items: items,
        session: session.id,
        totalPrice:totalPrice
    })
  }
  else{
    res.render("addcarterror")
  }
    

})
app.get("/product/:productId", (req, res) => {
    Product.findById(req.params.productId, (err, product) => {
        if (err) {
            res.send(err)
        } else {
            res.render("product", {
                product: product
            });
        }
    })
})
app.get("/addtocart/:id", (req, res) => {
    cart = new Cart(req.session.cart ? req.session.cart : {})
    req.session.cartitems = cart.generateArray()
    Product.findById(req.params.id, (err, product) => {
        if (err) {
            res.send(err)
        } else {
            cart.add(product, product._id)
            req.session.cart = cart
            req.session.cartitems = cart.generateArray()
            res.redirect("/")
        }
    })
})

app.get("/success",(req,res)=>{
    res.redirect("/clear");
})


app.get('/forgot', function(req, res) {
    res.render('forgot');
  });


app.post('/forgot', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            console.log('No account with that email address exists.');
            return res.redirect('/forgot');
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; 
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          host:"smtp.gmail.com",
          port:"465",
          auth: {
            user: 'shopsmart.customerservices@gmail.com',
            pass: process.env.GMAILPWD
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'shopsmart.customerservices@gmail.com',
          subject: 'ShopSmart:Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'https://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n- Shopsmart'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          console.log('mail sent');
          console.log('An e-mail has been sent to ' + user.email + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgot');
    });
});
  

app.get('/reset/:token', function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        console.log('Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', {token: req.params.token});
    });
  });
  

  app.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            console.log('Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
          if(req.body.password === req.body.confirm) {
            user.setPassword(req.body.password, function(err) {
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;
  
              user.save(function(err) {
                req.logIn(user, function(err) {
                  done(err, user);
                });
              });
            })
          } else {
              console.log("Passwords do not match.");
              return res.redirect('back');
          }
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: 'shopsmart.customerservices@gmail.com',
            pass: process.env.GMAILPW
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'shopsmart.customerservices@gmail.com',
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          console.log('Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/');
    });
  });
  
  
app.get("/clear",(req,res)=>{ 
    req.session.cart= {}
    req.session.cartitems= {}
    res.render("success")
})
app.listen(8080, function () {
    console.log("Server running on port 8080");
})
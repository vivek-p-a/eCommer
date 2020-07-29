const express = require('express')
const router = express.Router();
const passport = require("passport");
const User = require("../models/User");
router.get("/login", (req, res) => {
    console.log("FROM LOGIN"+ JSON.stringify(req.bodyuser));

    res.render("login",{user:req.user});
})
router.get("/register", (req, res) => {
    res.render("register",{user:req.user})
})

router.post("/register", (req, res) => {
    User.register({
        username: req.body.username,
        role:req.body.role
    }, req.body.password, function (err, user) {
        if (err) {
            console.log(err)
            res.send(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                console.log("SUCESSSSS!")
                console.log("FROM REGISTER"+ req.user)
                res.redirect("/");
            })
        }
    })
});
router.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password,
        role:req.body.role
    })
    
    req.login(user, function (err) {
        if (!err) {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/");
            })
        } else {
            console.log(err);
            res.send("Something went wrong");
        }
    })
});
router.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

module.exports = router
const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');
const userSchema = new mongoose.Schema({
    email: {type: String, unique: true, required: true},
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    username: String,
    password: String,
    role: {
        type: String,
        required: true,
    }
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
module.exports = mongoose.model("EcommerceUser", userSchema);
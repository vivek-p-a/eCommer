const mongoose = require("mongoose");
const productSchema={
    prod_img:{
        type:String,
        required:true
    },
    prod_name:{
        type:String,
        required:true,
        maxlength:50
    },
    price:{
        type:String,
        required:true,
    },
    qty:{
        type:String,
        required:true,
        maxlength: 100
    },
    description:{
        type:String,
        required:true,
        maxlength:800
    }
};
module.exports = mongoose.model("Product",productSchema);
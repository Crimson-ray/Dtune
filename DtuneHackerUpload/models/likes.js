const { boolean } = require('joi');
const mongoose=require('mongoose')
const Schema= mongoose.Schema;

const likeSchema=new Schema({
    userId:String,
    trackId:String,
    liked:Boolean,
    disliked:Boolean
})
module.exports=mongoose.model('Like',likeSchema)
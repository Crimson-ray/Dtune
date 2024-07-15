const { required } = require('joi');
const mongoose=require('mongoose')
const Schema= mongoose.Schema;
const passport=require('passport-local-mongoose')

const PlaylistSchema=new Schema({
     name:{
        type:String,
        required:true
     },
     songIds:{
        type: [Object],
        default: []     
     },
     image:{
        type:String,
        default:"https://t3.ftcdn.net/jpg/02/72/14/56/360_F_272145619_0msru0f2296jsjEliBht6ZcdUjqZwLZn.jpg"
     }
})

const UserSchema=new Schema({
    email:{
        type:String,
        required:[true,'Email is neccessary']
    },
    playlists:[PlaylistSchema]
})
UserSchema.plugin(passport)
module.exports=mongoose.model('User',UserSchema)
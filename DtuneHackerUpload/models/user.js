
const { required, date } = require('joi');
const mongoose=require('mongoose')
const Schema= mongoose.Schema;
const passport=require('passport-local-mongoose')

const artistSongSchema=new Schema({
        name:{
         type:String,
         required:true
        },
        preview_url:{
         type:String,
         required:true
        },
        filename:{
         type:String,
         required:true
        },
        user:{
         type:Schema.Types.ObjectId,
         ref:'User'
        }
})
artistSongSchema.index({name:'text'})
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
     },
     type:{
      type:String,
      default:'private'
     }
})

PlaylistSchema.index({name:'text'})
const InviteSchema = new Schema({
   user: {
     type: Schema.Types.ObjectId,
     ref: 'User'
   },
   playlist:PlaylistSchema,
   activatedAt: {
     type: Date,
     default: Date.now
   },
   playlist1:{
      type:Schema.Types.ObjectId
   },
   playlist2:{
      type:Schema.Types.ObjectId
   },
 });
InviteSchema.index({ activatedAt: 1 }, { expireAfterSeconds: 10 });
const UserSchema=new Schema({
   isArtist:{
      type:Boolean,
      //required:true
   },
    email:{
        type:String,
        required:[true,'Email is neccessary']
    },
    playlists:[PlaylistSchema],
    friends:[{
      type:Schema.Types.ObjectId,
      ref:'User'
    }],
    bio:String,
    friendRequestsSent:[{
      type:Schema.Types.ObjectId,
      ref:'User'
    }],
    friendRequestsReceived:[{
      type:Schema.Types.ObjectId,
      ref:'User'
    }],
    invitesActive:[InviteSchema],
    invitesReceived:[{
      user:{
         type:Schema.Types.ObjectId,
         ref:'User'
      },
      playlist:Schema.Types.ObjectId
    }],
    invitesSent:[{
      user:{
         type:Schema.Types.ObjectId,
         ref:'User'
      },
      playlist:Schema.Types.ObjectId
    }]
})
UserSchema.plugin(passport)
UserSchema.index({username:'text'})
module.exports.User=mongoose.model('User',UserSchema)
module.exports.Song=mongoose.model('Song',artistSongSchema)
const Like=require('../models/likes')
 
const likeTrack=async(userId,trackId,liked,disliked)=>{
    const result=await Like.updateOne({userId,trackId},{$set:{liked,disliked}},{upsert:true})
    console.log(result)
    return result

}

const getLikedTrack=async(userId)=>{
    const likedTracks=await Like.find({userId,liked:true})
    return likedTracks
}

const getUserLikes=async(userId,trackId)=>{
    const data= await Like.findOne({userId,trackId})
    if(data){
        return data
    }
   return {likes:false,dislikes:false}
}
module.exports={likeTrack,getLikedTrack,getUserLikes}

/*
const Like=require('../models/likes')
 
const likeTrack=async(userId,trackId,liked)=>{
    const result=await Like.updateOne({userId,trackId},{$set:{liked}},{upsert:true})
    console.log(result)
    return result

}

const getTrackLikes=async(trackId)=>{
    const likes= await Like.countDocuments({ trackId, liked: true });
    const dislikes=await Like.countDocuments({ trackId, liked: false });
    return {likes,dislikes}
}

const getUserLikes=async(userId,trackId)=>{
    const data= await Like.findOne({userId,trackId})
    if(data){
        const {liked}=data
        return liked
    }
   return null
}
module.exports={likeTrack,getTrackLikes,getUserLikes}
*/

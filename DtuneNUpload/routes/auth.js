const express=require('express')
const router=express.Router()
const {isLoggedIn}=require('../middleware')
const {getToken,getTrackDetails,getPlaylistForCategory,getCategories,getPlaylist,getSearch}=require('../utilities/api')
const {likeTrack,getTrackLikes,getUserLikes}=require('../utilities/likes')
const ExpressError=require('../utilities/ExpressError')
const { Promise } = require('node-fetch')
const User=require('../models/user')
const wrapAsync=function(fn){
    return function(req,res,next){
         fn(req,res,next).catch((e)=>{next(e)})
    }
}
router.use(isLoggedIn)

router.get('/profile',async (req,res,next)=>{
    await getToken()
    const categories=await getCategories()
    const playlistPromises=categories.map(category=>getPlaylistForCategory(category.id,'IN',5))
    const playlists=await Promise.all(playlistPromises)
    res.render('users/profile',{categories,playlists})
})

router.get('/playlist/:id',async(req,res)=>{
    await getToken()
    const {id}=req.params
    const result=await getPlaylist(id)
    const promises=result.map(async (track,i) => {
        const {liked,disliked}= await getUserLikes(req.user._id,track.track.id)
        const {likes=0}= await getTrackLikes(track.track.id)
        const {dislikes=0}= await getTrackLikes(track.track.id)
        result[i].likes=likes
        result[i].liked=liked
        result[i].dislikes=dislikes
        result[i].disliked=disliked
    });
    await Promise.all(promises)
    console.log(result[3].liked)
    res.render('users/playlist',{tracks:result})
})
router.get('/search',async(req,res,next)=>{
    await getToken()
    const {search}=req.query
    const result=await getSearch(search)
    const promises=result.map(async (track,i) => {
        const {liked,disliked}= await getUserLikes(req.user._id,track.id)
        const {likes=0}= await getTrackLikes(track.id)
        const {dislikes=0}= await getTrackLikes(track.id)
        result[i].likes=likes
        result[i].liked=liked
        result[i].dislikes=dislikes
        result[i].disliked=disliked
    });
    await Promise.all(promises)
    console.log(result[3].liked)
   res.render('users/search',{tracks:result})
})

router.post('/like',async(req,res,next)=>{
    console.log(req.query)
    const {trackId,like,dislike}=req.query
    console.log(trackId,like,dislike)
    const userId=req.user._id
    try{
        await likeTrack(userId,trackId,like,dislike)
        res.json({sucess:true})
    }
    catch(e){
         res.status(500).json({error:'Failed'})
    }
})

router.get('/createPlaylist',async(req,res,err)=>{
    res.render('users/newPlaylist')
})

router.post('/createPlaylist',async(req,res,err)=>{
   const { name,image=null } = req.body;
   const userId=req.user._id
   try{
    const user=await User.findById(userId);
    const existingPlaylist = user.playlists.find(playlist => playlist.name === name);
    if (existingPlaylist) {
        req.flash('error','Playlist name taken')
        return  res.redirect('/auth/createPlaylist')
        }
    user.playlists.push({name,image});
    await user.save();
    req.flash('success','Playlist created successfully')
    res.redirect('/auth/profile')
   }
   catch(e){
    res.status(500).json({error:'Failed'})
   }
})

router.get('/userPlaylists',async(req,res,err)=>{
    res.render('users/userPlaylists')
})

router.post('/updatePlaylist',async (req,res,err)=>{
   const {trackId,playlistId,action,trackUrl,trackName}=req.query
   const userId=req.user._id
   console.log(req.query)
   try {
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const playlist = user.playlists.id(playlistId);
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist not found' });
    }

    if (action === 'add') {
        if (!playlist.songIds.some(song => song.trackId === trackId)) {
            playlist.songIds.push({ trackId, trackUrl,trackName});
        }
    } else if (action === 'remove') {
        playlist.songIds = playlist.songIds.filter(song => song.trackId !== trackId);
    }
    await user.save();
    res.json({ success: true });
     } 
    catch{
        res.status(500).json({error:'Failed'})
    }
})
router.get('/userPlaylist/:id', async (req,res,err)=>{
    const {id}=req.params
    const userId=req.user._id
    const user= await User.findById(userId)
    const playlist = user.playlists.id(id);
    const trackUrl=[]
    const promises=playlist.songIds.map(async (track,i) => {
        const {liked,disliked}= await getUserLikes(req.user._id,track.trackId)
        track.liked=liked
        track.disliked=disliked
    });
    await Promise.all(promises)
    playlist.songIds.forEach(song=>{
        trackUrl.push(song.trackUrl)
    })
    console.log(playlist)
    res.render('users/userPlaylist',{playlist,trackUrl})
})

module.exports=router

/*
router.get('/search',async(req,res,next)=>{
    await getToken()
    const {search}=req.query
    const result=await getSearch(search)
    const promises=result.map(async (track,i) => {
        const {liked,disliked}= await getUserLikes(req.user._id,track.id)
        const {likes=0}= await getTrackLikes(track.id)
        const {dislikes=0}= await getTrackLikes(track.id)
        result[i].likes=likes
        result[i].liked=liked
        result[i].dislikes=dislikes
        result[i].disliked=disliked
    });
    await Promise.all(promises)
    console.log(result[3].liked)
   res.render('users/search',{tracks:result})
})

router.post('/like',async(req,res,next)=>{
    console.log(req.query)
    const {trackId,like,dislike}=req.query
    console.log(trackId,like,dislike)
    const userId=req.user._id
    try{
        await likeTrack(userId,trackId,like,dislike)
        res.json({sucess:true})
    }
    catch(e){
         res.status(500).json({error:'Failed'})
    }
})

})
router.get('/playlist/:id',async(req,res)=>{
    await getToken()
    const {id}=req.params
    const tracks=await getPlaylist(id)
    res.render('users/playlist',{tracks})
})*/
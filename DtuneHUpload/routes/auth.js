const express=require('express')
const router=express.Router()
const {isLoggedIn}=require('../middleware')
const {getToken,getTrackDetails,getPlaylistForCategory,getCategories,getPlaylist,getSearch}=require('../utilities/api')
const {likeTrack,getLikedTrack,getUserLikes}=require('../utilities/likes')
const { Promise } = require('node-fetch')
const {User,Song}=require('../models/user')
const wrapAsync=function(fn){
    return function(req,res,next){
         fn(req,res,next).catch((e)=>{next(e)})
    }
}
router.use(isLoggedIn)

router.get('/trending',async (req,res,next)=>{
    await getToken()
    const categories=await getCategories()
    const playlistPromises=categories.map(category=>getPlaylistForCategory(category.id,'IN',5))
    const playlists=await Promise.all(playlistPromises)
    res.render('users/trending',{categories,playlists})
})

router.get('/playlist/:id',async(req,res)=>{
    await getToken()
    const {id}=req.params
    const result=await getPlaylist(id)
    const promises=result.map(async (track,i) => {
        const {liked,disliked}= await getUserLikes(req.user._id,track.track.id)
        result[i].liked=liked
        result[i].disliked=disliked
    });
    await Promise.all(promises)
    console.log(result[3].liked)
    res.render('users/playlist',{tracks:result})
})
router.get('/search',async(req,res,next)=>{
    await getToken()
    const {search,type}=req.query
    if(type==='songs'){
    const result=await getSearch(search)
    const promises=result.map(async (track,i) => {
        const {liked,disliked}= await getUserLikes(req.user._id,track.id)
        result[i].liked=liked
        result[i].disliked=disliked
    });
    await Promise.all(promises)
    const artistSongs=await Song.find({'name':{$regex:search,$options:'i'}}).populate('user')
    const promisesArtist=artistSongs.map(async (track,i) => {
        const {liked,disliked}= await getUserLikes(req.user._id,track._id)
        artistSongs[i].liked=liked
        artistSongs[i].disliked=disliked
    });
    await Promise.all(promisesArtist)
    console.log(artistSongs)
   res.render('users/search',{tracks:result,artistTracks:artistSongs})
  }
  else if(type==='users'){
    let users=await User.find({'username':{$regex:search,$options:'i'}})
    users=users.filter(user=>user.username!==req.user.username)
    res.render('users/users',{users})
  }
  else{
   const users= await User.find({'playlists.name':{$regex:search,$options:'i'}}).lean()
   let matchedPlaylist=[]
   users.forEach(user=>{
    user.playlists.forEach(playlist=>{
        if((playlist.name.toLowerCase().includes(search.toLowerCase())) && playlist.type==='public'){
            matchedPlaylist.push({userId:user._id,username:user.username,playlist})
        }
    })
   })
    res.render('users/publicPlaylists',{ playlists:matchedPlaylist})
  }
   
})

router.post('/like',async(req,res,next)=>{
    console.log(req.query)
    const {trackId,trackName,trackUrl,like,dislike}=req.query
    console.log(trackId,trackName,trackUrl,like,dislike)
    const userId=req.user._id
    try{
        await likeTrack(userId,trackId,like,dislike)
        const name='Liked Songs'
        const image="https://i1.sndcdn.com/artworks-y6qitUuZoS6y8LQo-5s2pPA-t500x500.jpg"
        const user = await User.findById(userId);
        let likedPlaylist = user.playlists.find(playlist => playlist.name === name);
        if(like==='true'){
        if (!likedPlaylist) {
            likedPlaylist = { name, image, songIds: [] };
            user.playlists.push(likedPlaylist);
            await user.save();
        }
        if (!likedPlaylist.songIds.some(song => song.trackId === trackId)) {
            likedPlaylist = user.playlists.find(playlist => playlist.name === name);
            likedPlaylist.songIds.push({ trackId, trackUrl, trackName });
            console.log('pushed')
            await user.save();
        }
        }
       else{
        if (likedPlaylist && likedPlaylist.songIds.some(song => song.trackId === trackId)) {
            likedPlaylist.songIds = likedPlaylist.songIds.filter(song => song.trackId !== trackId);
            await user.save();
        }
        }
       res.json({sucess:true})
       }
         catch(e){
         console.error(e);
         res.status(500).json({error:'Failed'})
       }
})

//Friends 

router.get('/friendRequests',async (req,res,err)=>{
    const userId=req.user._id
    const user=await User.findById(userId).populate('friendRequestsReceived')
    const friendRequests=await User.find({_id:{$in:user.friendRequestsReceived}})
    res.render('users/friendRequests', { friendRequests });
})
router.post('/sendFriendRequest/:userId',async (req,res,err)=>{
    try{
    const {userId}=req.params
    const user=await User.findById(req.user._id)
    if (user.friendRequestsSent.includes(userId)) {
        res.json({ success: false, message: 'Friend request already sent.' });
    }
    else if(user.friends.includes(userId)){
        res.json({ success: false, message: 'Alredy your Friend' });
    }

    user.friendRequestsSent.push(userId)
    await user.save()

    const wouldBeFriend=await User.findById(userId)
    wouldBeFriend.friendRequestsReceived.push(req.user._id)
    await wouldBeFriend.save()
    res.json({ success: true, message: 'Sent request' });
    }
    catch(e){
    console.log(e)
    res.json({ success: false, message: 'Error sending request' });
    }
})
router.post('/unsendFriendRequest/:userId',async (req,res,err)=>{
    try{
    const {userId}=req.params
    const user=await User.findById(req.user._id)
    if (!user.friendRequestsSent.includes(userId)) {
        req.flash('error', 'Error');
        return res.redirect('/auth/trending');
    }
    user.friendRequestsSent=user.friendRequestsSent.filter(request=>request.toString() !== userId)
    await user.save()
    const wouldBeFriend=await User.findById(userId)
    wouldBeFriend.friendRequestsReceived=wouldBeFriend.friendRequestsReceived.filter(request => request.toString() !== req.user._id.toString())
    await wouldBeFriend.save()
    res.json({ success: true, message: 'UnSent' });
    }
    catch(e){
        console.log(e)
        res.json({ success: false, message: 'Error unsending request' });
    }
})
router.post('/acceptFriendRequest/:userId',async (req,res,err)=>{
    try{
    const {userId}=req.params
    const user=await User.findById(req.user._id)
    user.friendRequestsReceived=user.friendRequestsReceived.filter(request=>request.toString() !== userId)
    user.friends.push(userId);
    await user.save()
    const wouldBeFriend=await User.findById(userId)
    wouldBeFriend.friendRequestsSent=wouldBeFriend.friendRequestsSent.filter(request => request.toString() !== req.user._id.toString())
    wouldBeFriend.friends.push(req.user._id);
    await wouldBeFriend.save()
    req.flash('success', 'Friend request accepted!');
    res.send('Accepted');
    }
    catch(err){
        console.log(e)
    req.flash('error', 'Error accepting friend request');
    res.redirect('/auth/trending');
    }
})

router.post('/unfriend/:userId',async (req,res,err)=>{
    try{
        const {userId}=req.params
        const user=await User.findById(req.user._id)
        user.friends=user.friends.filter(friend=>friend.toString() !== userId)
        await user.save()
        const unfriended=await User.findById(userId)
        unfriended.friends=unfriended.friends.filter(friend=>friend.toString() !== req.user._id.toString())
        await unfriended.save()
        res.json({ success: true, message: 'Unfriended' });
        }
        catch(err){
            console.log(e)
            res.json({ success: false, message: 'Error unfriending' });
        } 
})

router.post('rejectFriendRequest/:userId',async (req,res)=>{
    try{
        const {userId}=req.params
        const user=await User.findById(req.user._id)
        user.friendRequestsReceived=user.friendRequestsReceived.filter(request=>request.toString() !== userId)
        user.friends=user.friends.filter(request=>request.toString() !== userId)
        await user.save()
        const wouldBeFriend=await User.findById(userId)
        wouldBeFriend.friendRequestsSent=wouldBeFriend.friendRequestsSent.filter(request => request.toString() !== req.user._id.toString())
        wouldBeFriend.friends=wouldBeFriend.friends.filter(request => request.toString() !== req.user._id.toString())
        await wouldBeFriend.save()
        req.flash('success', 'Friend request rejected!');
        res.send('Ignored');

    }
    catch(e){
        console.log(e)
        req.flash('error', 'Error rejecting friend request');
        res.redirect('/auth/trending');
    }
})

//playlist 
router.get('/PublicPlaylist/:playlist',async(req,res,err)=>{
let {playlist}=req.params
playlist=JSON.parse(playlist)
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
router.get('/createPlaylist',async(req,res,err)=>{
    res.render('users/newPlaylist')
})

router.post('/createPlaylist',async(req,res,err)=>{
   const { name,image=null,type=null} = req.body;
   const userId=req.user._id
   try{
    const user=await User.findById(userId);
    const existingPlaylist = user.playlists.find(playlist => playlist.name === name);
    if (existingPlaylist || name==='Liked Songs') {
        req.flash('error','Playlist name taken')
        return  res.redirect('/auth/createPlaylist')
        }
    user.playlists.push({name,image,type});
    await user.save();
    req.flash('success','Playlist created successfully')
    res.redirect('/auth/trending')
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
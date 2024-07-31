const express=require('express')
const router=express.Router()
const {isLoggedIn, isExpired}=require('../middleware')
const {getToken,getTrackDetails,getPlaylistForCategory,getCategories,getPlaylist,getSearch,getLyrics}=require('../utilities/api')
const {likeTrack,getLikedTrack,getUserLikes}=require('../utilities/likes')
const { Promise } = require('node-fetch')
const {User,Song, Playlist}=require('../models/user')
const wrapAsync=function(fn){
    return function(req,res,next){
         fn(req,res,next).catch((e)=>{next(e)})
    }
}
router.use(isLoggedIn)
router.use(isExpired)
router.get('/trending',async (req,res,next)=>{
    const user = await User.findById(req.user._id);
    user.currentSong={trackName:null,trackId:null,trackUrl:null,trackImage:null}
    await user.save()
    await getToken()
    const categories=await getCategories()
    const playlistPromises=categories.map(category=>getPlaylistForCategory(category.id,'IN',5))
    const playlists=await Promise.all(playlistPromises)
    res.render('users/trending',{categories,playlists})
})


router.post('/currentSong',async(req,res,err)=>{
    try{
    const {trackId,trackName,trackUrl,trackImage}=req.query
    const userId=req.user._id;
    const user = await User.findById(userId);
    user.currentSong={trackId,trackName,trackUrl,trackImage}
    await user.save()
    console.log(user.currentSong)
    res.json({success:true,message:'Current song updated',song:user.currentSong})
    }catch(e){
    res.json({ success: false, message: 'Cannot update currentSong' });
    }
})
router.get('/playlist/:id',async(req,res)=>{
    const { default: pLimit } = await import('p-limit');

    const limit = pLimit(10);
    await getToken()
    const userId=req.user._id;
    const user=await User.findById(userId);
    user.currentSong={trackName:null,trackId:null,trackUrl:null,trackImage:null}
    await user.save()
    const {id}=req.params
    const result=await getPlaylist(id)
    function formatLyrics(lyrics) {
        return lyrics.replace(/\n/g, '<br>');
    }
    const promises=result.map(async (track,i) => limit(async () =>{
        if(track.track){
        const {liked,disliked}= await getUserLikes(req.user._id,track.track.id)
        result[i].liked=liked
        result[i].disliked=disliked
        let lyrics=await getLyrics(track.track.artists[0].name,track.track.name)
        if(lyrics===undefined){
            result[i].lyrics='Not available'
        }
        else{
            lyrics=formatLyrics(lyrics)
            result[i].lyrics=lyrics
        }
        }
        else{
            return  res.render('users/playlist',{tracks:[]})
        }
    }));
    await Promise.all(promises)
    res.render('users/playlist',{tracks:result})
})
router.get('/search',async(req,res,next)=>{
    await getToken()
    const {search,type}=req.query
    const { default: pLimit } = await import('p-limit');

    const limit = pLimit(10);
    const userId=req.user._id;
    const user=await User.findById(userId);
    user.currentSong={trackName:null,trackId:null,trackUrl:null,trackImage:null}
    await user.save()
    if(type==='songs'){
    const result=await getSearch(search,'track')
    if(!result){
        req.flash("error",'enter value to search')
        return res.redirect('/auth/trending')
    }
    function formatLyrics(lyrics) {
        return lyrics.replace(/\n/g, '<br>');
    }
    const promises=result.map(async (track,i) =>limit(async () => {
        const {liked,disliked}= await getUserLikes(req.user._id,track.id)
        result[i].liked=liked
        result[i].disliked=disliked
        let lyrics=await getLyrics(result[i].artists[0].name,result[i].name)
        if(lyrics===undefined){
            result[i].lyrics='Not available'
        }
        else{
            lyrics=formatLyrics(lyrics)
            result[i].lyrics=lyrics
        }
    })
    );
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
    const result=await getSearch(search,'playlist')
   const users= await User.find({'playlists.name':{$regex:search,$options:'i'}}).lean()
   let matchedPlaylist=[]
   users.forEach(user=>{
    user.playlists.forEach(playlist=>{
        if((playlist.name.toLowerCase().includes(search.toLowerCase())) && playlist.type==='public'){
            matchedPlaylist.push({userId:user._id,username:user.username,playlist})
        }
    })
   })
   console.log(result)
    res.render('users/publicPlaylists',{ playlists:matchedPlaylist,result})
  }
   
})

router.post('/like',async(req,res,next)=>{
    console.log(req.query)
    const {trackId,trackName,trackUrl,like,dislike,trackImage}=req.query
    const {trackLyrics}=req.body
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
            likedPlaylist.songIds.push({ trackId, trackUrl, trackName,trackImage,trackLyrics });
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

router.post('/rejectFriendRequest/:userId',async (req,res)=>{
    try{
        const {userId}=req.params
        const user=await User.findById(req.user._id)
        user.friendRequestsReceived=user.friendRequestsReceived.filter(request=>request.toString() !== userId)
        await user.save()
        const wouldBeFriend=await User.findById(userId)
        wouldBeFriend.friendRequestsSent=wouldBeFriend.friendRequestsSent.filter(request => request.toString() !== req.user._id.toString())
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

router.get('/friends',async(req,res)=>{
try{
    const user=await User.findById(req.user._id).populate('friends')
    const friends= user.friends.map(friend=>{ return {username:friend.username,bio:friend.bio,playlists:friend.playlists,friends:friend.friends,_id:friend._id}})
    user.currentSong={trackName:null,trackId:null,trackUrl:null,trackImage:null}
    await user.save()
    console.log(friends)
    res.render('users/friends',{friends});
    }catch(e){
    res.json({ success: false, message: 'Error Viewing Friends' });
    }
})
// partyMode
router.post('/invite/:userId',async (req,res)=>{
    try{
        const {userId}=req.params;
        const {playlist}=req.body
        console.log(playlist)  
        console.log(userId)
        const user=await User.findById(req.user._id)
        console.log(user)
        if (user.invitesSent.some(invite=>invite.user.toString()===userId)) {
            return res.json({ success: false, message: 'Invite request already sent.' });
        }
        else if(user.invitesActive.some(invite=>invite.user.toString()===userId)){
            return res.json({ success: false, message: 'Already in Partymode with user' });
        }
        user.invitesSent.push({user:userId,playlist})
        await user.save()
    
        const otherUser=await User.findById(userId)
        otherUser.invitesReceived.push({user:req.user._id,playlist})
        await otherUser.save()
        return res.json({ success: true, message: 'Sent invite' });
        }
        catch(e){
        console.log(e)
        return res.json({ success: false, message: 'Error sending invite' });
        }
})
router.post('/uninvite/:userId',async(req,res)=>{
    try{
        const {userId}=req.params
        const user=await User.findById(req.user._id)
        if (!user.invitesSent.some(invite=>invite.user.toString()===userId)) {
            req.flash('error', 'Error');
            return res.redirect('/auth/trending');
        }
        user.invitesSent=user.invitesSent.filter(request=>request.user.toString() !== userId)
        await user.save()
        const otherUser=await User.findById(userId)
        otherUser.invitesReceived=otherUser.invitesReceived.filter(request => request.user.toString() !== req.user._id.toString())
        await otherUser.save()
        res.json({ success: true, message: 'Uninvited' });
        }
        catch(e){
            console.log(e)
            res.json({ success: false, message: 'Error uninviting' });
        }
})

router.post('/joinParty/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { playlist } = req.body;

        const user = await User.findById(req.user._id);
        const otherUser = await User.findById(userId);

        if (!user || !otherUser) {
            req.flash('error', 'User not found');
            return res.redirect('/auth/trending');
        }

        let receivedPlaylist;
        const invite = user.invitesReceived.find(invite => invite.user.toString() === userId);

        if (!invite) {
            req.flash('error', 'Invite not found');
            return res.redirect('/auth/trending');
        }

        receivedPlaylist = invite.playlist;
        const otherPlaylist = otherUser.playlists.id(receivedPlaylist);
        const userPlaylist = user.playlists.id(playlist);

        if (!otherPlaylist || !userPlaylist) {
            req.flash('error', 'Playlist not found');
            return res.redirect('/auth/trending');
        }

        const name = `${otherPlaylist.name} X ${userPlaylist.name}`;
        const songIds = [...otherPlaylist.songIds, ...userPlaylist.songIds];
        const image = 'https://t4.ftcdn.net/jpg/01/20/28/25/360_F_120282530_gMCruc8XX2mwf5YtODLV2O1TGHzu4CAb.jpg';
        const play=new Playlist({name,songIds,image})
        otherUser.invitesSent = otherUser.invitesSent.filter(invite => invite.user.toString() !== req.user._id.toString());
        await play.save()
        await user.invitesActive.push({ user: userId,playlist:play._id,playlist1:userPlaylist._id,playlist2:otherPlaylist._id});
        await otherUser.invitesActive.push({ user: req.user._id, playlist:play._id,playlist1:otherPlaylist._id,playlist2:userPlaylist._id});

        user.invitesReceived = user.invitesReceived.filter(invite => invite.user.toString() !== userId.toString());
        await user.save();
        await otherUser.save();

        res.json({ success: true, message: 'Joined Party' });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong');
        res.redirect('/auth/trending');
    }
});
router.post('/rejectParty/:userId', async (req, res)=>{
    try{
    const { userId } = req.params;
    const user = await User.findById(req.user._id);
    const otherUser = await User.findById(userId);
    const invite = user.invitesReceived.find(invite => invite.user.toString() === userId);

        if (!invite) {
            req.flash('error', 'Invite not found');
            return res.redirect('/auth/trending');
        }
        user.invitesReceived = user.invitesReceived.filter(invite => invite.user.toString() !== userId);
        otherUser.invitesSent = otherUser.invitesSent.filter(invite => invite.user.toString() !== req.user._id.toString());

        await user.save();
        await otherUser.save();
        res.json({ success: true, message: 'Rejected Party' });
    } catch(error){
        console.error(error);
        req.flash('error', 'Something went wrong');
        res.redirect('/auth/trending');
    }

})
router.post('/leaveParty/:userId', async (req, res)=>{
    try{
    const { userId } = req.params;
    const user = await User.findById(req.user._id);
    const otherUser = await User.findById(userId);
    const invite = user.invitesActive.find(invite => invite.user.toString() === userId);

        if (!invite) {
            req.flash('error', 'Party not found');
            return res.redirect('/auth/trending');
        }
        user.invitesActive = user.invitesActive.filter(invite => invite.user.toString() !== userId);
        otherUser.invitesActive = otherUser.invitesActive.filter(invite => invite.user.toString() !== req.user._id.toString());

        await user.save();
        await otherUser.save();
        res.json({ success: true, message: 'Left Party' });
    } catch(error){
        console.error(error);
        req.flash('error', 'Something went wrong');
        res.redirect('/auth/trending');
    }

})

router.get('/invites',(req,res)=>{

})
//playlist 
router.get('/PublicPlaylist',async(req,res,err)=>{
let {playlistId}=req.query
const users=await User.find({})
const userId=req.user._id
const user= await User.findById(userId)
user.currentSong={trackName:null,trackId:null,trackUrl:null,trackImage:null}
let Playlist;
   users.forEach(user=>{
    user.playlists.forEach(playlist=>{
        if(playlist._id.toString()===playlistId && playlist.type==='public'){
            Playlist=playlist;
        }
    })
    })
    const trackUrl=[]
    const promises=Playlist.songIds.map(async (track,i) => {
        const {liked,disliked}= await getUserLikes(req.user._id,track.trackId)
        track.liked=liked
        track.disliked=disliked
    });
    await Promise.all(promises)
    Playlist.songIds.forEach(song=>{
        trackUrl.push(song.trackUrl)
   })
   res.render('users/userPlaylist',{playlist:Playlist,trackUrl,track})
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
    const userId=req.user._id
    let inviteImage=[];
const user= await User.findById(userId)
user.currentSong={trackName:null,trackId:null,trackUrl:null,trackImage:null}
const partPromise=user.invitesActive.map(async invite=>{
    inviteImage.push(invite.image);
    return await Playlist.findById(invite.playlist)
})
const partPlaylists=await  Promise.all(partPromise)
console.log(partPlaylists)
    res.render('users/userPlaylists',{partPlaylists,inviteImage})
})

router.post('/updatePlaylist',async (req,res,err)=>{
   const {trackId,playlistId,action,trackUrl,trackName,trackImage}=req.query
   const {trackLyrics}=req.body
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
            playlist.songIds.push({ trackId, trackUrl,trackName,trackImage,trackLyrics});
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
    user.currentSong={trackName:null,trackId:null,trackUrl:null,trackImage:null}
    await user.save()
    const playlist = user.playlists.id(id);
    const trackUrl=[]
    const tracks=[]
    const promises=playlist.songIds.map(async (track,i) => {
        const {liked,disliked}= await getUserLikes(req.user._id,track.trackId)
        track.liked=liked
        track.disliked=disliked
    });
    await Promise.all(promises)
    playlist.songIds.forEach(song=>{
        trackUrl.push(song.trackUrl)
        tracks.push({trackName:song.trackName,trackId:song.trackId,trackImage:song.trackImage})
    })
    res.render('users/userPlaylist',{playlist,trackUrl,tracks})
})
router.get('/partyPlaylist', async (req,res,err)=>{
    try{
    const {id,image}=req.query
    const userId=req.user._id
    const user= await User.findById(userId)
    user.currentSong={trackName:null,trackId:null,trackUrl:null,trackImage:null}
    await user.save()
    const playlist=await Playlist.findById(id);
    const trackUrl=[]
    const tracks=[]
    const promises=playlist.songIds.map(async (track,i) => {
        const {liked,disliked}= await getUserLikes(req.user._id,track.trackId)
        track.liked=liked
        track.disliked=disliked
    });
    await Promise.all(promises)
    playlist.songIds.forEach(song=>{
        trackUrl.push(song.trackUrl)
        tracks.push({trackName:song.trackName,trackId:song.trackId,trackImage:song.trackImage})
    })
    console.log(playlist)
    playlist.image=image
    res.render('users/userPlaylist',{playlist,trackUrl,tracks})
}catch(e){
    next(err)
}
})


module.exports=router

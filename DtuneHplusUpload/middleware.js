const {User,Playlist}=require('./models/user')
module.exports.isLoggedIn=(req,res,next)=>{
    if(!req.isAuthenticated()){
     req.session.returnTo=req.originalUrl;
     req.flash('error','You must be signed in')
     return res.redirect('/users/login')
    }
    next();
}
module.exports.isExpired=async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).send('User not found');
    }
    const now = Date.now();

    const updatePromises = user.invitesActive.map(async (invite) => {
      if (now - invite.isActivated.getTime() >= 3600000) { 
        const otherUser = await User.findById(invite.user);

        if (otherUser) {
          await Playlist.findByIdAndDelete(invite.playlist)
          user.invitesActive = user.invitesActive.filter(i => i.user.toString() !== invite.user.toString());
          await user.save();
        }
      }
    });
    await Promise.all(updatePromises);
    const promises=user.invitesActive.map(async (invite) => {
      const otherUser = await User.findById(invite.user);
      const userPlaylist=await user.playlists.id(invite.playlist1)
      const otherPlaylist=await otherUser.playlists.id(invite.playlist2)
      console.log(invite.playlist)
      const playlist=await Playlist.findById(invite.playlist.toString())
      console.log(playlist)
      //console.log(userPlaylist,otherPlaylist)
      const userTrack=userPlaylist.songIds.map(song => song.trackId)
      let otherPlaylistWithoutOverlap=otherPlaylist
      otherPlaylistWithoutOverlap.songIds=otherPlaylist.songIds.filter(song=>!userTrack.includes(song.trackId))
      playlist.songIds=[...otherPlaylistWithoutOverlap.songIds, ...userPlaylist.songIds];
      await playlist.save()
      await user.save();
    })
    await Promise.all(promises);
    next();
  } catch (err) {
    next(err);
  }
}
module.exports.isLoggedOut=(req,res,next)=>{
    if(req.isAuthenticated()){
        return res.redirect('/auth/trending')
    }
    next()
}

module.exports.Artist=(req,res,next)=>{
    if(!req.user.isArtist){
        req.flash('error','Access Denied !! Not an Artist')
        return res.redirect('/auth/trending')
    }
    next()
}
module.exports.storeReturnTo=(req,res,next)=>{
    if(req.session.returnTo){
        res.locals.returnTo=req.session.returnTo;
    }
    next();
}
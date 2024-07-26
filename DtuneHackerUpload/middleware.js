const {User}=require('./models/user')
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
        if (now - invite.activatedAt.getTime() >= 3600000) { 
          const otherUser = await User.findById(invite.user);
  
          if (otherUser) {
            user.invitesActive = user.invitesActive.filter(i => i.user.toString() !== invite.user.toString());
            otherUser.invitesActive = otherUser.invitesActive.filter(i => i.user.toString() !== req.user._id.toString());
            await user.save();
            await otherUser.save();
          }
        }
      });
      await Promise.all(updatePromises);
      const promises=user.invitesActive.map(async (invite) => {
        const otherUser = await User.findById(invite.user);
        const userPlaylist=await user.playlists.id(invite.playlist1)
        const otherPlaylist=await otherUser.playlists.id(invite.playlist2)
        const Invite= await user.invitesActive.id(invite._id)
        console.log(userPlaylist,otherPlaylist)
        const userTrack=userPlaylist.songIds.map(song => song.trackId)
        let otherPlaylistWithoutOverlap=otherPlaylist
        otherPlaylistWithoutOverlap.songIds=otherPlaylist.songIds.filter(song=>!userTrack.includes(song.trackId))
        Invite.playlist.songIds=[...otherPlaylistWithoutOverlap.songIds, ...userPlaylist.songIds];
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
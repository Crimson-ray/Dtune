module.exports.isLoggedIn=(req,res,next)=>{
    if(!req.isAuthenticated()){
     req.session.returnTo=req.originalUrl;
     req.flash('error','You must be signed in')
     return res.redirect('/users/login')
    }
    next();
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
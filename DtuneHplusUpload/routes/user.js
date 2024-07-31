const express=require('express')
const router=express.Router()
const ExpressError=require('../utilities/ExpressError')
const { User, Song } = require('../models/user');
const passport=require('passport')
const { isLoggedOut, isLoggedIn } = require('../middleware')
require('dotenv').config()
const dauthId=process.env.DAUTH_ID;
const dauthSecret=process.env.DAUTH_SECRET;
const dauthUrl=process.env.DAUTH_URL;
//const {storeReturnTo}=require('../middleware')

const wrapAsync=function(fn){
    return function(req,res,next){
         fn(req,res,next).catch((e)=>{next(e)})
    }
}
router.get('/currentSong', async (req, res) => {
    try {
        console.log('Received request for current song with query:', req.query);
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const username = user.username;
        const currentSong = user.currentSong;
console.log(currentSong)
        console.log('Returning current song for user:', username);
        return res.json({ success: true, currentSong, username });
    } catch (e) {
        console.error('Error in currentSong route:', e);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});
router.get('/register',isLoggedOut,(req,res)=>{
    res.render('login/register')
})
router.post('/register',async(req,res)=>{
    try{
        const {email,username,password,artist,bio}=req.body
        console.log(artist)
        let isArtist=false
        if(artist==='true'){
            isArtist=true
        }
        const user=new User({username,isArtist,email,bio})
        const registeredUser =await User.register(user,password)
        req.login(registeredUser,function(err){
            if(err) return next(err);
        console.log(isArtist)
        req.flash('success','Welcome To Dtune')
        res.redirect('/auth/trending')
        })
        }
        catch(e){
            req.flash('error',e.message)
            console.log(e.message)
            res.redirect('/users/register')
        }
})

router.get('/login',isLoggedOut,(req,res)=>{
    res.render('login/login')
})
router.post('/login',passport.authenticate('local',{failureFlash:true,failureRedirect:'/users/login'}),async (req,res)=>{
    req.flash('success','Welcome To Dtune')
    res.redirect('/auth/trending');
})

router.get('/dauth',async (req,res)=>{
const params=new URLSearchParams({
    client_id : dauthId,
    redirect_uri: dauthUrl,
    response_type:'code',
    grant_type:'authorization_code',
    state:'sdafsdghb',
    scope:"email+openid+profile+user",
    nonce:'bscsbascbadcsbasccabs'
})
res.redirect(`https://auth.delta.nitt.edu/authorize?${params}`)
})

router.get('/callback',async (req,res)=>{
    try {
    const {code,state}=req.query
    const params=new URLSearchParams({
        client_id : dauthId,
        client_secret:dauthSecret,
        grant_type:'authorization_code',
        code:code,
        redirect_uri: dauthUrl
    })
    const tokenResponse= await fetch('https://auth.delta.nitt.edu/api/oauth/token',{
        method:'POST',
        headers:{
            'Content-Type':'application/x-www-form-urlencoded'
        },
        body:params
    })

    const token= await tokenResponse.json()
    if(token.access_token){
       const userResponse = await fetch('https://auth.delta.nitt.edu/api/resources/user',{
        method:'POST',
        headers:{
            'Authorization': `Bearer ${token.access_token}`
        }
       })
       const userToken=await userResponse.json()
       const {name:username,email}=userToken
       let user = await User.findOne({ email });
       if(!user){
        user=new User({username,email,invitesSent:[],invitesReceived:[],invitesActive:[],isArtist:false,bio:''});
        await user.save()
       }
       req.login(user, (err) => {
        if (err) return next(err);
        req.flash('success', 'Welcome To Dtune');
        return res.redirect('/auth/trending');
    });
    }
    else {
        req.flash('error', 'Failed to authenticate with DAuth');
        return res.redirect('/users/login');
    }
 }
 catch(e){
    req.flash('error', e.message);
    return res.redirect('/users/login');
 }
})

router.get('/logout',isLoggedIn,(req, res, next) => {
        req.logout(function(err){
            if(err){
                return next(err);
            }
            req.flash('success','Successfully logged out')
            res.redirect('/')
        })

}); 
module.exports=router
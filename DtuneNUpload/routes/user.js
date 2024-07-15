const express=require('express')
const router=express.Router()
const ExpressError=require('../utilities/ExpressError')
const User=require('../models/user')
const passport=require('passport')
//const {storeReturnTo}=require('../middleware')

const wrapAsync=function(fn){
    return function(req,res,next){
         fn(req,res,next).catch((e)=>{next(e)})
    }
}
router.get('/register',(req,res)=>{
    res.render('login/register')
})
router.post('/register',async(req,res)=>{
    try{
        const {email,username,password}=req.body
        const user=new User({username,email})
        const registeredUser =await User.register(user,password)
        req.login(registeredUser,function(err){
            if(err) return next(err);
        req.flash('success','Welcome To Dtune')
        res.redirect('/auth/profile')
        })
        }
        catch(e){
            req.flash('error',e.message)
            console.log(e.message)
            res.redirect('/users/register')
        }
})

router.get('/login',(req,res)=>{
    res.render('login/login')
})
router.post('/login',passport.authenticate('local',{failureFlash:true,failureRedirect:'/users/login'}),async (req,res)=>{
    req.flash('success','Welcome To Dtune')
    res.redirect('/auth/profile');
})
router.get('/logout', (req, res, next) => {
        req.logout(function(err){
            if(err){
                return next(err);
            }
            req.flash('success','Successfully logged out')
            res.redirect('/')
        })

}); 
module.exports=router
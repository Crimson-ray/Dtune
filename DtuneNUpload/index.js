//packages
const express= require('express')
const app=express()
const mongoose=require('mongoose')
const path= require('path')
const session=require('express-session')
const flash=require('connect-flash')
const ejsMate=require('ejs-mate')
const passport=require('passport')
const LocalStrategy=require('passport-local')
//routes
const userRoutes=require('./routes/user')
const authRoutes=require('./routes/auth')
//exports
const User=require('./models/user')
const {isLoggedIn}=require('./middleware')


const wrapAsync=function(fn){
    return function(req,res,next){
         fn(req,res,next).catch((e)=>{next(e)})
    }
}

//mongoose connection
mongoose.connect('mongodb://127.0.0.1:27017/DtuneN')
.then(()=>{
    console.log('connected to data base')
})
.catch((e)=>{
    console.log('Database Connection Error')
    console.log(e)
})

//configuration
app.set('view engine','ejs')
app.engine('ejs', ejsMate);
app.set('views',path.join(__dirname,'views'))

app.use(express.urlencoded({extended:true}));

const sessionOptions={secret:'secret',resave:false,saveUninitialized:true,httpOnly:true,expires:Date.now()+1000*60*60*24*3,maxAge:1000*60*60*24*3}
app.use(session(sessionOptions))
app.use(flash())

//passport 
app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

//flash
app.use((req,res,next)=>{
    res.locals.user=req.user
    res.locals.success=req.flash('success')
    res.locals.error=req.flash('error')
    next()
})

//cache
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

//routes

app.get('/',(req,res)=>{
    res.render('home')
})

app.get('/secret',isLoggedIn,(req,res)=>{
    res.render('secret')
})
app.use('/users',userRoutes)
app.use('/auth',authRoutes)

app.all('*',(req,res,next)=>{
    next(new ExpressError('Page Not Found',404))
})
//error handling
app.use((err,req,res,next)=>{
    const {status=500,message="something went wrong"}=err
    res.status(status).send(message)
 })

app.listen(3000,()=>{
    console.log('listening on port 3000')
})


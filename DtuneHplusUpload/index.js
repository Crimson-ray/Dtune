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
const multer=require('multer')
const ExpressError=require('./utilities/ExpressError')
//routes
const userRoutes=require('./routes/user')
const authRoutes=require('./routes/auth')
const artistRoutes=require('./routes/artist')
//exports
const {User,Song}=require('./models/user')
const {isLoggedIn}=require('./middleware')


const wrapAsync=function(fn){
    return function(req,res,next){
         fn(req,res,next).catch((e)=>{next(e)})
    }
}

//mongoose connection
mongoose.connect('mongodb://127.0.0.1:27017/Dtune1')
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
app.use(express.json())

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


app.get('/secret',isLoggedIn,(req,res)=>{
    res.render('secret')
})
app.use('/users',userRoutes)
app.use('/auth',authRoutes)
app.use('/artist',artistRoutes)
app.get('/', async (req, res) => {
    if (!req.user) {
        return res.render('home');
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    const friends = user.friends;
    user.currentSong={trackName:null,trackId:null,trackUrl:null,trackImage:null}
    await user.save()
    if (friends) {
        try {
            const friendPromises = friends.map(async (friend) => {
                try {
                    const params = new URLSearchParams({ userId: friend });
                    const response = await fetch(`http://localhost:3000/users/currentSong?${params}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        throw new Error('Failed to get current song');
                    }

                    const data = await response.json();
                    console.log('Got current song', data);
                    return data;
                } catch (error) {
                    console.error('Error getting current song', error);
                    return null; // Returning null in case of an error
                }
            });

            const friendsData = await Promise.all(friendPromises);
            return res.render('home', { Friends: friendsData });
        } catch (error) {
            console.error('Error processing friends', error);
            return res.status(500).send('Internal Server Error');
        }
    }
    return res.render('home');
});

app.all('*',(req,res,next)=>{
    next(new ExpressError('Page Not Found',404))
})
//error handling
app.use((err,req,res,next)=>{
    const {status=500,message="something went wrong"}=err
    res.status(status).json(message)
 })

app.listen(3000,()=>{
    console.log('listening on port 3000')
})


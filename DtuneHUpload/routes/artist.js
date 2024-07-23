const multer=require('multer')
const {storage}=require('../config/cloud')
const upload=multer({storage:storage})
const express=require('express')
const { isLoggedIn, Artist } = require('../middleware')
const router=express.Router()
const {Song}=require('../models/user')
router.use(isLoggedIn)
router.use(Artist)
router.get('/upload',(req,res,err)=>{
    res.render('artists/new')
})
router.post('/upload',upload.single('file'),async (req,res,err)=>{
    try{
        const {filename,path}=req.file
        const {name}=req.body
        const user=req.user
        const song= await new Song({name,preview_url:path,filename,user})
        await song.save()
        req.flash('success','Song uploaded successfully')
        res.redirect('/auth/trending')
    }
    catch(e){
        req.flash('error',`Failed Upload ${e}`)
        res.redirect('/artist/upload')
    }     
 })

 module.exports=router
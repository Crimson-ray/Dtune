const cloudinary=require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
require('dotenv').config()

const cloudName=process.env.CLOUD_NAME
const cloudKey=process.env.CLOUD_KEY
const cloudSecret=process.env.CLOUD_SECRET


cloudinary.config({
    cloud_name:cloudName,
    api_key:cloudKey,
    api_secret:cloudSecret
});

const storage = new CloudinaryStorage({
    cloudinary,
    params:{
        folder:'Dtune',
        resource_type:'auto',
        allowedFormats:['mp3','mp4']
    }
})

module.exports.storage=storage
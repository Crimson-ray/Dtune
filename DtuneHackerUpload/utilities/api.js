const fetch =require('node-fetch')
require('dotenv').config()
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const tokenUrl = 'https://accounts.spotify.com/api/token'
 
let cachedToken=null;
let tokenExpiresAt=null

const getToken=async()=>{
    if(cachedToken && tokenExpiresAt && tokenExpiresAt > new Date() ){
        return cachedToken
    }
    try{
    const response= await fetch(tokenUrl,{
        method:'POST',
        headers:{
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        },
        body: 'grant_type=client_credentials'
        
    })
    const data=await response.json()
    cachedToken = data.access_token;
    tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
    return data.access_token;
}catch(e){
    console.log(e)
}
}

const getCategories = async (country = 'IN', limit = 10) => {
    const url = `https://api.spotify.com/v1/browse/categories?country=${country}&limit=${limit}`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${cachedToken}`
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        return data.categories.items;
    } catch (e) {
        console.error('Error fetching categories:', e.message);
    }
};

const getSearch=async(search,type)=>{
    const url=`https://api.spotify.com/v1/search?q=${search}&type=${type}`
    try{
        const response=await fetch(url,{
            method:'GET',
            headers:{
                'Authorization':`Bearer ${cachedToken}`,
                'Content-Type': 'application/json',
            }
        })
        const data=await response.json();
        if(!response.ok){
            throw new Error('Failed to fetch categories')
        }
        if(type==='track'){
        return data.tracks.items
        }
        else{
            return data.playlists.items
        }
    }
    catch (e) {
        console.error('Error fetching categories:', e.message);
    }
}
const getPlaylistForCategory=async(categoryId,country='IN',limit=10)=>{
    const response = await fetch(`https://api.spotify.com/v1/browse/categories/${categoryId}/playlists?country=${country}&limit=${limit}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${cachedToken}`
        }
    });
    const data = await response.json();
    return data.playlists.items;
}

const getPlaylist=async(playlist_id)=>{
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks?limit=10`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cachedToken}`
        }
    });
    const data = await response.json();
    return data.items;
}
async function getTrackDetails(trackId) {
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cachedToken}`
      }
    });
  
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
  
    const data = await response.json();
    return data;
  }

  const dauthAuth=async()=>{

  }
module.exports.getToken=getToken
module.exports.getTrackDetails=getTrackDetails
module.exports.getCategories=getCategories
module.exports.getPlaylistForCategory=getPlaylistForCategory
module.exports.getPlaylist=getPlaylist
module.exports.getSearch=getSearch
module.exports.dauthAuth=dauthAuth

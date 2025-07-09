import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"
import { ApiError } from './ApiError.js';

// Configuration
cloudinary.config({ 
    cloud_name: `${process.env.CLOUDINARY_CLOUD_NAME}`, 
    api_key: `${process.env.CLOUDINARY_API_KEY}`, 
    api_secret: `${process.env.CLOUDINARY_API_SECRET}` // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary=async (localFilePath)=>{
    try{
        if(!localFilePath) return null;
        //upload on cloudinary
        const response=await cloudinary.uploader.upload(`${localFilePath}`, 
            {
                resource_type:"auto"
            }
        )
        //file has been uploaded successfully
        // console.log("file is uploaded on cloudinary and response url is: ",response.secure_url)
        fs.unlinkSync(localFilePath);
        // console.log(response);
        return response
    }
    catch(error){
        console.log(`unlinking ${localFilePath}!!`)
        fs.unlinkSync(localFilePath) //remove the locally saved temp file as the upload failed
        return null;
    }
}


const deleteOnCloudinary= async (public_id)=>{
    try {
        const response = await cloudinary.uploader.destroy(public_id, {
            resource_type: "image"
        });
        // console.log("Delete response:", response);
        return;
    } 
    catch (error) {
        console.log(error);
        throw new ApiError(500,"Error deleting old file on cloudinary")
    }
}

// // Upload an image
// const uploadResult = await cloudinary.uploader
// .upload(
//     'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
//         public_id: 'shoes',
//     }
// )
// .catch((error) => {
//     console.log(error);
// });
    
export {uploadOnCloudinary,deleteOnCloudinary}
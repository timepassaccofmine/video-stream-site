import {AsyncHandler} from "../utils/AsyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser= AsyncHandler(async(req,res)=>{
    //get user details from frontend
    //validation: if sent empty
    //check if already exists based on username and email
    //check for images,check for avatar
    //upload them to cloudinary take response.url,avatar
    //create user object-create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return res

    
    const {fullName,email,username,password}=await req.body;
    console.log(req.body);
    //empty value validation
    if(
        [fullName,email,username,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"All required fields are not entered.");
    }
    //email validation
    if(!(/^[a-zA-Z0-9._]+@[a-zA-Z0-9._]+\.[^\s@]{2,}$/.test(email))){
        throw new ApiError(400,"Invalid email syntax")
    }

    const existingUser=await User.findOne({
        $or:[{username},{email}]
    })
    console.log(existingUser);
    if(existingUser){
        throw new ApiError(409,"User with email or username exists");
    }
    console.log(req);
    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar is not uploaded");
    }

    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username:username.toLowerCase(),
    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering User");
    }

    res.status(201).json(
        new ApiResponse(200,createdUser,"User registered succesfully.")
    )

})

export {registerUser}
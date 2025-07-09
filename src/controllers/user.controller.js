import {AsyncHandler} from "../utils/AsyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary,deleteOnCloudinary} from "../utils/cloudinary.js";
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
    // console.log(req.body);
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
    // console.log(existingUser);
    if(existingUser){
        throw new ApiError(409,"User with email or username exists");
    }
    console.log(req.files);
    const avatarLocalPath=req.files?.avatar?.[0].path;
    const coverImageLocalPath=req.files?.coverImage?.[0].path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);
    console.log(avatar);
    const coverImage= coverImageLocalPath?await uploadOnCloudinary(coverImageLocalPath):null;

    if(!avatar){
        throw new ApiError(400,"Avatar is not uploaded");
    }
    
    
    const user=await User.create({
        fullName,
        avatar:avatar.secure_url,
        coverImage: coverImage?.secure_url || "",
        email,
        username:username.toLowerCase(),
        password
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

const generateAccessAndRefreshToken =async (userId)=>{
    try{
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();

        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave: false});
        
        return {accessToken,refreshToken};
    }
    catch(error){
        throw new ApiError(500,"Something went wrong while generating Access or Refresh Token");
    }
}

const loginUser=AsyncHandler(async(req,res)=>{
    //username or email,passsword validation
    //access and refresh token 
    //send cookie

    const {email,username,password}=await req.body;
    if(!email && !username){
        throw new ApiError(400,"username or email must be filled");
    }
    const existingUser=await User.findOne({
            $or:[{username},{email}],
        }
    )
    if(!existingUser){
        throw new ApiError(400,"No such username or email found");
    }
    // console.log(User.schema.methods);
    const isPassValid=await existingUser.isPasswordCorrect(password);
    if(!isPassValid){
        throw new ApiError(400,"Invalid User credentials");
    }
    
    const {refreshToken,accessToken}= await generateAccessAndRefreshToken(existingUser._id);
    existingUser.accessToken=accessToken;
    
    const options={
        httpOnly:true,
        secure:true, 
        // maxAge: 1000 * 60 * 60
    }
    // console.log(Object.getPrototypeOf(existingUser)); // here you can see the methods attached to the object inherited from User.schema
    const { password: _, ...userSafe } = existingUser.toObject();

    res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: userSafe,
                accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
    )
})

const logoutUser=AsyncHandler(async(req,res)=>{
    // req.user._id
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{refreshToken: null}
        },
        // {new:true}
    )

    const options={
        httpOnly:true,
        secure:true, 
        // maxAge: 1000 * 60 * 60
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},`Succesfully Logged Out from ${req.user.username}`));
})

const refreshAccessToken=AsyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorised Request refresh-token (give refresh_token)")
    }

    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        const user=User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Sorry accessToken can't be refreshed as refreshToken invalid")
        }
        if(incomingRefreshToken!== user?.refreshToken){
            throw new ApiError(401,"Refresh token expired or used");
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken} =await generateAccessAndRefreshToken(user.id)
        
        res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(new ApiResponse(200,
            {accessToken,refreshToken: newRefreshToken},
            "access token refreshed successfully"
        ))
    } catch (error) {
        throw new ApiError(401,error?.message || "Cant refresh accesstoken");
    }
})

const changeCurrentPassword=AsyncHandler(async(req,res)=>{
    // const decodedToken=jwt.verify(req.cookies?.refreshToken,process.env.REFRESH_TOKEN_SECRET);
    // const userId=decodedToken._id;
    const {oldPassword,newPassword}=req.body;
    const existingUser=await User.findById(req?.user?._id);
    const isPassValid=await existingUser.isPasswordCorrect(oldPassword);
    if(!isPassValid){
        throw new ApiError(401,"Invalid Password");
    }

    existingUser.password=newPassword;
    //we have used pre middleware in user.model.js
    // so it will take care of saving password
    await existingUser.save({validateBeforeSave:false});

    res.status(200)
    .json(new ApiResponse(200,"Password changed successfully"))
})

const getCurrentUser=AsyncHandler(async (req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200,req.user,"current user fetched successfully"))
})

const updateAccountDetails=AsyncHandler(async(req,res)=>{
    //need both email and fullName to update
    const {fullName,email,username}=req.body;

    if(!fullName || !email){
        throw new ApiError(400,"All fields required");
    }
    
    // const updates={};
    // if(fullName){
    //     updates.fullName=fullName;
    // }
    // if(email){
    //     updates.email=email;
    // }
    // if(username){
    //     updates.username=username;
    // }

    // or using spread and truthy values|| shortcircuiting and spread

    const updates = {
        ...(fullName && { fullName }),
        ...(email && { email }),
        ...(username && { username }),
    };

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            //email means email:email es6 syntax
            $set:updates
        },
        {new:true}
    ).select("-password -refreshToken");

    res.status(200)
    .json(new ApiResponse(200,user,"Account details updated"));
})

const updateUserAvatar=AsyncHandler(async (req,res)=>{
    const avatarLocalPath=req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"No avatar uploaded to be updated");
    }
    const oldUser=await User.findById(req?.user?._id).select("-password -refreshToken");;
    const oldAvatar=oldUser?.avatar;
    const public_id=oldAvatar.split("/").pop().split('.')[0];
    // console.log(public_id);
    await deleteOnCloudinary(public_id);

    const {secure_url: avatarSecureUrl}=await uploadOnCloudinary(avatarLocalPath);
    if(!avatarSecureUrl){
        throw new ApiError(400,"Updated Avatar not uploaded on cloudinary successfully");
    }

    // const user=await User.updateOne(
    //     req.user?._id,
    //     {
    //         $set:{avatar:avatarSecureUrl}
    //     },
    //     {new:true}
    // ).select("-password -refreshToken");

    oldUser.avatar=avatarSecureUrl;
    await oldUser.save({validateBeforeSave: false});

    res.status(200)
    .json(new ApiResponse(200,"Avatar updated successfully"));
})

const updateCoverImage=AsyncHandler(async (req,res)=>{
    const coverImageLocalPath=req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(400,"No coverImage uploaded to be updated");
    }
    const oldUser=await User.findById(req?.user?._id).select("-password -refreshToken");;
    const oldCoverImage=oldUser?.coverImage;
    const public_id=oldCoverImage.split("/").pop().split(".")[0];
    await deleteOnCloudinary(public_id);
    
    const {secure_url: coverImageSecureUrl}=await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImageSecureUrl){
        throw new ApiError(400,"Updated coverImage not uploaded on cloudinary successfully");
    }

    oldUser.coverImage=coverImageSecureUrl;
    await oldUser.save({validateBeforeSave: false});

    res.status(200)
    .json(new ApiResponse(200,"CoverImage updated successfully"));
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    getCurrentUser,
    updateCoverImage
}
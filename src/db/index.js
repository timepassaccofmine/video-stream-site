import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB=async ()=>{
    try{
        const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDB connected !! DB Host: ${connectionInstance.connection.name}`);
    }
    catch(error){
        console.error("Error connecting Mongodb: "+error);
        process.exit(1);
    }
}

export {connectDB};
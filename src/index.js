import mongoose from "mongoose";
import express from "express";
import 'dotenv/config';
import { connectDB } from "./db/index.js";

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server listening on Port: ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log(`Mongodb connection error!!! `,err);
});

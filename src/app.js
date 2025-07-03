import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import multer from "multer"

const app=express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())
// const m=multer(); //to use in formdata passing to req.body

//routes import
import userRouter from "./routes/user.routes.js"


//routes declaration
// app.use("/api/v1/users",multer.none(),userRouter) //for form data 
app.use("/api/v1/users",userRouter)

export { app }
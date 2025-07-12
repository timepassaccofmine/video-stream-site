import { Router } from "express";
import { loginUser, registerUser, logoutUser, refreshAccessToken,changeCurrentPassword,updateAccountDetails,updateUserAvatar,getCurrentUser,updateCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router=Router()

router.route("/register").post(upload.fields(
    [
        {
            name:"avatar",
            maxCount:1
        },
        {
            name: "coverImage",
            maxCount:1
        }
    ]),
    registerUser
)

router.route("/login").post(
    loginUser
)

//secured routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT,changeCurrentPassword);
router.route("/get-current-user").post(verifyJWT,getCurrentUser);
router.route("/update-avatar").post(verifyJWT,upload.single("avatar"),updateUserAvatar);
router.route("/update-cover-image").post(verifyJWT,upload.single("coverImage"),updateCoverImage);
router.route("/update-account-details").post(verifyJWT,updateAccountDetails);

export default router
import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  removeVIdFromWatchHistory,
  updateUserAvatar,
  updateUserDetails,
  updatedCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

// +++ REGISTER ROUTE ++++
router.route("/register").post(
  // ++++ MULTER MIDDLEWARE INJECTION ++++
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),

  //   ++++ CONTROLLER ++++
  registerUser
);

// ++++++ LOGIN ROUTE +++++
router.route("/login").post(loginUser);

// +++++ LOGOUT ROUTE ++++++
router.route("/logout").post(verifyJwt, logoutUser);

// +++++++ REFRESH ACCESS TOKEN ROUTE ++++++++
router.route("/refresh-token").post(refreshAccessToken);

// ++++++++ CHANGE CURRENT PASSWORD ROUTE ++++++++
router.route("/change-password").post(verifyJwt, changeCurrentPassword);

// ++++++ GET CURRENT USER ROUTE +++++++
router.route("/current-user").get(verifyJwt, getCurrentUser);

// ++++++++ UPDATE USER DETAILS ROUTE ++++++++
router.route("/update-user").patch(verifyJwt, updateUserDetails);

// ++++++++ UPDATE AVATAR ROUTE ++++++++
router.route("/update-avatar").patch(
  // AUTH MIDDLEWARE INJECTION
  verifyJwt,
  // MULTER MIDDLEWARE INJECTION
  upload.single("avatar"),

  updateUserAvatar
);

// ++++++++ UPDATE COVER-IMAGE ROUTE +++++++++
router.route("/update-cover-image").patch(
  // AUTH MIDDLEWARE INJECTION
  verifyJwt,
  // MULTER MIDDLEWARE INJECTION
  upload.single("coverImage"),
  updatedCoverImage
);

// ++++++++ GET CHANNEL PROFILE ROUTE ++++++
router.route("/channel-profile").get(getUserChannelProfile);

// +++++++++ GET USER WATCH-HISTORY ROUTE +++++++++
router
  .route("/watch-history")
  .get(verifyJwt, getWatchHistory)
  .patch(verifyJwt, removeVIdFromWatchHistory);

export default router;

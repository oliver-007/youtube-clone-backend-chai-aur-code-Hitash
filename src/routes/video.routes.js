import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  deleteVideo,
  getAllVideos,
  getAllVideosOfAUser,
  getVideoById,
  togglePublishStatus,
  updateVideo,
  videoUpload,
} from "../controllers/video.controller.js";

const router = Router();

// ++++++ GET ALL USER'S ALL VIDEOS WITH || WITHOUT LOGIN ++++++
router.route("/").get(getAllVideos);

// +++++++++ GET ALL VIDEOS OF A USER, ROUTE +++++++++
router.route("/user").get(getAllVideosOfAUser);

// ++++++++++ GET SINGLE VIDEO BY ID ++++++++++
router.route("/vid").get(getVideoById);

router.use(verifyJwt); // Apply verifyJwt middleware to the following routes bellow in this file

// ++++++++ VIDEO UPLOAD ROUTE +++++++++
router.route("/").post(
  // MULTER MIDDLEWARE INJECTION
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  videoUpload
);

// +++++++ VIDEO TITLE, DESCRIPTION, THUMBNAIL EDIT ROUTE +++++++
router.route("/update").patch(
  // MULTER MIDDLEWARE INJECTION
  upload.single("thumbnail"),
  updateVideo
);

// +++++++++++ VIDEO DELETE ROUTE ++++++++++++++
router.route("/delete").delete(deleteVideo);

// ++++++++ VIDEO PUBLISH TOGGLE ROUTE ++++++++
router.route("/publish/toggle").patch(togglePublishStatus);

export default router;

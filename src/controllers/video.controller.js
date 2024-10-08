import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { pagination } from "../utils/pagination.js";

// +++++++ VIDEO UPLOAD +++++++
const videoUpload = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // CURRENT USER DETAILS
  const currentUser = req.user;
  // console.log("currentUser --- ", currentUser);

  if (!(title && description)) {
    throw new ApiError(400, "Title & Description are required !");
  }

  // console.log("Title -----", title);
  // console.log("description -----", description);

  // VIDEO FILE LOCAL PATH FROM MULTER
  let videoFileLocalPath;
  if (
    req.files &&
    req.files.videoFile &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile[0].path
  ) {
    videoFileLocalPath = req.files.videoFile[0].path;
  }
  // console.log("Video_File local path ---", videoFileLocalPath);

  // THUMBNAIL LOCAL PATH FROM MULTER
  let thumbnailLocalPath;
  if (
    req.files &&
    req.files.thumbnail &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail[0].path
  ) {
    thumbnailLocalPath = req.files.thumbnail[0].path;
  }
  // console.log("Thumbnail local path ---", thumbnailLocalPath);

  // FILE UPLOAD ON CLOUDINARY

  // VIDEO FILE CLOUDINARY URL
  const videoFileCloudinaryResponse =
    await uploadOnCloudinary(videoFileLocalPath);

  // THUMBNAIL CLOUDINARY URL
  const thumbnailCloudinaryResponse =
    await uploadOnCloudinary(thumbnailLocalPath);

  // console.log(
  //   "videoFile_CloudinaryUrl -----",
  //   videoFileCloudinaryResponse?.url
  // );
  // console.log(
  //   "videoFileCloudinaryResponse - ---- ",
  //   videoFileCloudinaryResponse
  // );
  // console.log(
  //   "thumbnailCloudinaryResponse =-=-=- ",
  //   thumbnailCloudinaryResponse
  // );
  // console.log(
  //   "thumbnail_CloudinaryUrl -----",
  //   thumbnailCloudinaryResponse?.url
  // );

  // +++++++++ VIDEO FILE & THUMBNAIL & DETAILS UPLOAD ON DATABASE ++++++++++
  const video = await Video.create({
    videoFile: videoFileCloudinaryResponse?.url,
    video_public_id: videoFileCloudinaryResponse?.public_id,
    thumbnail: thumbnailCloudinaryResponse?.url,
    thumbnail_public_id: thumbnailCloudinaryResponse?.public_id,
    title,
    description,
    duration: videoFileCloudinaryResponse?.duration,
    owner: currentUser._id,
  });

  if (!video) {
    throw new ApiError(
      500,
      "Something went worng while uploading video file on database ! "
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video uploaded Successfully. 👍 "));
});

// +++++++++++ GET ALL VIDEOS OF ALL USERS +++++++++
const getAllVideos = asyncHandler(async (req, res) => {
  const { page, limit, query, sortBy, sortType, userId } = req.query; // here 'limit' porps is inActive, but keep this props for future modification, which'll come from frontend.
  const totalVideos = await Video.countDocuments({ isPublished: true });
  const { parsedLimitForPerPage, skip, totalPages } = await pagination(
    page,
    limit,
    totalVideos
  );

  // AGGREGATION PIPELINE ON VIDEO MODEL INSTEAD OF POPULATE()
  const allVideosAggregateWithPagination = await Video.aggregate([
    {
      $match: {
        isPublished: true,
      },
      // Empty match stage fetches all documents
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: parsedLimitForPerPage,
    },
  ]);

  // console.log("allVideos =-=-=-=-", allVideosAggregateWithPagination);

  // if (!allVideosAggregateWithPagination.length > 0) {
  //   throw new ApiError(400, "No video found !!!");
  // }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { allVideosAggregateWithPagination, totalPages, totalVideos },
        `${allVideosAggregateWithPagination.length > 0 ? "All videos fetched Successfully." : "No Video Found !!!"}`
      )
    );
});

// ++++++++++ GET ALL VIDEOS OF A SPECIFIC USER ++++++++
const getAllVideosOfAUser = asyncHandler(async (req, res) => {
  const { uId, page, limit, signedInUserId } = req.query; // here 'limit' porps is inActive, but keep this props for future modification, which'll come from frontend.

  // console.log(
  //   "signedInUserId from videoController: lineNo : 175 ",
  //   signedInUserId
  // );
  // console.log("uid -=-=-=- ", uId);
  // console.log("page -=-=-=- ", page);
  // console.log("limit -=-=-=- ", limit);

  if (!uId) {
    throw new ApiError(400, "User id required !!!");
  }

  if (!isValidObjectId(uId)) {
    throw new ApiError(400, "Invalid user id !!!");
  }

  // PAGINATION

  const totalVideos = await Video.countDocuments({
    owner: uId,
  });

  const totalPublishedVideos = await Video.countDocuments({
    owner: uId,
    isPublished: true,
  });
  const totalUnPublishedVideos = await Video.countDocuments({
    owner: uId,
    isPublished: false,
  });

  const { parsedLimitForPerPage, skip, totalPages } = await pagination(
    page,
    limit,
    totalVideos
  );

  const allVideosOfAUserAggregateWithPagination = await Video.aggregate([
    new mongoose.Types.ObjectId(uId)?.equals(signedInUserId)
      ? {
          $match: {
            owner: new mongoose.Types.ObjectId(signedInUserId),
          },
        }
      : {
          $match: {
            owner: new mongoose.Types.ObjectId(uId),
            isPublished: true,
          },
        },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: parsedLimitForPerPage,
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        allVideosOfAUserAggregateWithPagination,
        totalPages,
        totalVideos,
        totalPublishedVideos,
        totalUnPublishedVideos,
      },
      `${allVideosOfAUserAggregateWithPagination.length > 0 ? `Videos of ${new mongoose.Types.ObjectId(uId).equals(signedInUserId) ? "Your channel" : "this channel"} fetched successfully` : "No Video Found !!!"}`
    )
  );
});

// ++++++++ GET VIDEO BY VIDEO ID TO WATCH ++++++++
const getVideoById = asyncHandler(async (req, res) => {
  const { vId, uId } = req.query;

  if (!isValidObjectId(vId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  const isVideoExists = await Video.findById(vId);

  if (!isVideoExists) {
    throw new ApiError(400, "Vidoe not found!  ");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(vId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
          // $arrayElemAt: ["$owner", 0],
        },
      },
    },
  ]);

  // INCREMENT VIEWS OF VIDEOS
  if (isValidObjectId(uId)) {
    // without isValidObjectId() , null value gives error.
    const currentUser = await User.findById(uId).select(
      "-password -avatar_public_id -coverImage_public_id -refreshToken"
    );

    if (!currentUser.watchHistory.includes(vId)) {
      await Video.findByIdAndUpdate(
        vId,
        {
          $inc: {
            views: 1,
          },
        },
        { new: true }
      );
    }

    // *************** IMPORTANT ********************
    // When I use $addToSet in MongoDB, it ensures that a value is only added to the array if it doesn't already exist. However, it does not guarantee any specific order for the elements in the array, especially if the array already contains the element I'm adding. If the video is already in the watchHistory array, $addToSet will simply prevent duplication, but it won't move the item to the end of the array.

    // Desired Behavior: Last Watched Video on Top
    // If I want the most recently watched video to always appear at the end (or top when sorted), $addToSet is not suitable. Instead, you should use the $pull operator to first remove the video (if it exists) and then use $push to add it back to the array, ensuring it's placed at the last position. But since I want to add the latest watched video to the top of the array, I've to do this : To push the video to the top of the watchHistory array (i.e., to make it the first element in the array), I've to use MongoDB's $push operator with the $each and $position modifiers. This allows me to insert the video at a specific position—in this case, at the beginning of the array.

    // PUT VIDEO_ID IN USER'S WATCH_HISTORY ARRAY
    if (currentUser.watchHistory.includes(vId)) {
      await User.findByIdAndUpdate(uId, {
        // First remove the video if it exists in the array
        $pull: {
          watchHistory: vId,
        },
      });
    }

    // Now, push the video to the top (position 0) of the watchHistory array
    await User.findByIdAndUpdate(
      uId,
      {
        $push: {
          watchHistory: vId,
          // {
          //   $each: [vId],
          //   $position: 0, // This pushes the video to the top of the array
          // },
        },
      },
      {
        new: true,
      }
    );

    // ************* PUT VIDEO_ID IN USER'S WATCH_HISTORY ARRAY **********
    // await User.findByIdAndUpdate(
    //   uId,

    //   {
    //     $addToSet: {
    //       watchHistory: vId,
    //     },
    //   },
    //   {
    //     new: true,
    //   }
    // );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched by id successfully."));
});

// ++++++++ UPDATE VIDEO DETAILS +++++++
const updateVideo = asyncHandler(async (req, res) => {
  const { vId } = req.query;
  const { title, description } = req.body;

  // console.log("vId  from updae-video controller lineNo:376 *******", vId);
  // console.log("title  from updae-video controller lineNo:377 *******", title);
  // console.log(
  //   "dercription from updae-video controller lineNo:378 *******",
  //   description
  // );

  if (!isValidObjectId(vId)) {
    throw new ApiError(400, "Invalid video id !");
  }

  const videoDetailsBeforeUpdate = await Video.findById(vId);
  // console.log("videoDetailsBeforeUpdate ---- ", videoDetailsBeforeUpdate);

  const previousVideoThumbnailPublicId =
    videoDetailsBeforeUpdate?.thumbnail_public_id;

  // console.log(
  //   "previousVideoThumbnailPublicId ----",
  //   previousVideoThumbnailPublicId
  // );

  if (!previousVideoThumbnailPublicId) {
    throw new ApiError(400, "Previous video thumbnail public_id not found !");
  }

  if (!(title && description)) {
    throw new ApiError(400, "Title & Description ara required ! ");
  }

  // UPDATED THUMBNAIL LOCAL FILE PATH
  const updatedThumbnailLocalPath = req.file?.path;
  // console.log("thumbnail----", req.file);

  // if (!updatedThumbnailLocalPath) {
  //   throw new ApiError(400, " Updated Thumbnail Local file path not found !");
  // }

  // UPLOAD ON CLUDINARY UPDATED THUMBNAIL
  const updatedThumbnailCloudinaryResponse =
    updatedThumbnailLocalPath &&
    (await uploadOnCloudinary(updatedThumbnailLocalPath));

  // console.log(
  //   "updatedThumbnailCloudinaryResponse ----",
  //   updatedThumbnailCloudinaryResponse
  // );

  // if (!updatedThumbnailCloudinaryResponse?.url) {
  //   throw new ApiError(
  //     400,
  //     " Updated-thumbnail upload on cloudinary FAILED ( url & public_id not found) !!! "
  //   );
  // }

  const updatedThumbnailCloudinaryUrl =
    updatedThumbnailCloudinaryResponse &&
    updatedThumbnailCloudinaryResponse?.url;

  // UPDATE METHOD APPLY
  const updatedVideoDetails = await Video.findByIdAndUpdate(
    vId,
    {
      $set: {
        title,
        description,
        thumbnail:
          updatedThumbnailCloudinaryUrl || videoDetailsBeforeUpdate.thumbnail,
      },
    },
    { new: true }
  );

  // DELETE PREVIOUS THUMBNAIL FORM CLOUDINARY CLOUD
  updatedThumbnailCloudinaryUrl &&
    (await deleteFromCloudinary(previousVideoThumbnailPublicId));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideoDetails,
        "Video details updated Successfully ."
      )
    );
});

// +++++++++ DELETE VIDEO +++++++++
const deleteVideo = asyncHandler(async (req, res) => {
  const { vId } = req.query;

  if (!isValidObjectId(vId)) {
    throw new ApiError(400, "Invalid video Id !");
  }

  const videoDetailsFromDatabase = await Video.findById(vId);
  // console.log("videoDetailsFromDatabase =-=-=- ", videoDetailsFromDatabase);

  if (!videoDetailsFromDatabase) {
    throw new ApiError(400, "Video not found !");
  }

  const videoFilePublicId = videoDetailsFromDatabase.video_public_id;
  const videoThumbnailPublicId = videoDetailsFromDatabase.thumbnail_public_id;

  // DELETE VIDEO FROM DATABASE
  const deletedVideoResponse = await Video.findByIdAndDelete(vId);
  // console.log("deletedVideoResponse -- ", deletedVideoResponse);

  if (!deletedVideoResponse) {
    throw new ApiError(500, "Video Deletion from database FAILED ! ");
  }

  // DELETE VIDEO & THUMBNAIL FROM CLOUDINARY
  await deleteFromCloudinary(videoFilePublicId, "video");
  await deleteFromCloudinary(videoThumbnailPublicId, "image");

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedVideoResponse, "Video deleted Successfully.")
    );
});

// ++++++++ VIDEO PUBLISH TOGGLE +++++++
const togglePublishStatus = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;
  const { vId } = req.query;

  if (!isValidObjectId(vId)) {
    throw new ApiError(400, "Invalid Video Id !");
  }

  const videoExist = await Video.findById(vId);

  if (!videoExist) {
    throw new ApiError(400, "Video not found !");
  }

  // VIDEO OWNER VERIFICATION
  let updatedVideoPublishStatus;
  if (!videoExist?.owner.equals(currentUserId)) {
    throw new ApiError(
      400,
      "You are not authorized to perform this action !!!"
    );
  } else {
    const publishStatusToggled = !videoExist.isPublished;

    updatedVideoPublishStatus = await Video.findByIdAndUpdate(
      vId,
      {
        $set: {
          isPublished: publishStatusToggled,
        },
      },
      { new: true }
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: updatedVideoPublishStatus.isPublished },
        updatedVideoPublishStatus.isPublished
          ? "Video Published "
          : "Video Unpublished"
      )
    );
});

export {
  videoUpload,
  getAllVideos,
  getAllVideosOfAUser,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};

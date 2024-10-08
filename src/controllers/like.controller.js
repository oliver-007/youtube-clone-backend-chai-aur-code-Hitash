import mongoose, { isValidObjectId, mongo } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";

// +++++++++ GET VIDEO LIKE COUNT WITHOUT SIGN-IN OR WITHOUT LIKING VIDEO ++++++++++
const getVideoTotalLike = asyncHandler(async (req, res) => {
  const { vId, uId } = req.query;

  if (!isValidObjectId(vId)) {
    throw new ApiError(400, "Invalid video Id !!!");
  }

  const videoExist = await Video.findById(vId);

  if (!videoExist) {
    throw new ApiError(400, "Video not found !!!");
  }

  let videoLikeStatus;
  // let totalLike;

  if (isValidObjectId(uId)) {
    // WITHOUT isValidObjectId() IT'LL SHOW ERROR
    const isVideoLiked = await Like.findOne({
      likedBy: uId,
      video: vId,
    });

    // +++++CHECKING WHETHER CURRENT USER ALREADY LIKED OR NOT ++++
    if (isVideoLiked) {
      videoLikeStatus = { isVideoLiked: true };
    } else {
      videoLikeStatus = { isVideoLiked: false };
    }
  }

  // FIND OUT LIKE COUNT OF A SPECIFIC VIDEO, USING VIDEO-ID, FROM LIKE DOCUMENT USING AGGREGATION PIPELINE
  const likeCountResult = await Like.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(vId),
      },
    },
    {
      $count: "likeCount",
    },
  ]);

  const totalLike =
    // In case no documents are found.
    likeCountResult.length > 0 ? likeCountResult[0].likeCount : 0;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videoLikeStatus, totalLike },
        "Total like count & like status of this video fetched successfully."
      )
    );
});

// ++++++++ TOGGLE VIDEO LIKE +++++++++
const toggleVideoLike = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id !!!");
  }

  const videoExist = await Video.findById(videoId);
  if (!videoExist) {
    throw new ApiError(400, "Video not found !!!");
  }

  const isVideoLiked = await Like.findOne({
    likedBy: currentUserId,
    video: videoId,
  });

  // TOGGLE VIDEO LIKE
  let videoLikeStatus;

  if (!isVideoLiked) {
    await Like.create({
      video: videoId,
      likedBy: currentUserId,
    });

    videoLikeStatus = { isVideoLiked: true };
  } else {
    await Like.findByIdAndDelete(isVideoLiked?._id);
    videoLikeStatus = { isVideoLiked: false };
  }

  // FIND OUT LIKE COUNT OF A SPECIFIC VIDEO, USING VIDEO-ID, FROM LIKE DOCUMENT USING AGGREGATION PIPELINE
  const likeCountResult = await Like.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $count: "likeCount",
    },
  ]);

  const totalLike =
    // In case no documents are found.
    likeCountResult.length > 0 ? likeCountResult[0].likeCount : 0;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videoLikeStatus, totalLike },
        videoLikeStatus.isVideoLiked
          ? "You Liked the video."
          : "You removed Like form the video."
      )
    );
});

// +++++++++ GET COMMENT LIKE COUNT WITHOUT SIGN-IN OR WITHOUT LIKING COMMENT ++++++++++
const getCommentTotalLike = asyncHandler(async (req, res) => {
  const { commId, uId } = req.query;

  if (!isValidObjectId(commId)) {
    throw new ApiError(400, "Invalid Comment Id !!!");
  }

  const commentExist = await Comment.findById(commId);

  if (!commentExist) {
    throw new ApiError(400, "Comment not found !!!");
  }

  let commentLikeStatus;

  if (isValidObjectId(uId)) {
    // WITHOUT isValidObjectId() IT'LL SHOW ERROR
    const isCommentLiked = await Like.findOne({
      likedBy: uId,
      comment: commId,
    });

    // +++++ CHECKING WHETHER CURRENT USER ALREADY LIKED OR NOT ++++
    if (isCommentLiked) {
      commentLikeStatus = { isCommentLiked: true };
    } else {
      commentLikeStatus = { isCommentLiked: false };
    }
  }

  // FIND OUT LIKE COUNT OF A SPECIFIC COMMENT, USING COMMENT-ID, FROM LIKE DOCUMENT USING AGGREGATION PIPELINE
  const likeCountResult = await Like.aggregate([
    {
      $match: {
        comment: new mongoose.Types.ObjectId(commId),
      },
    },
    {
      $count: "likeCount",
    },
  ]);

  const totalLike =
    // In case no documents are found.
    likeCountResult.length > 0 ? likeCountResult[0].likeCount : 0;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { commentLikeStatus, totalLike },
        "Total like count & like status of this comment fetched successfully."
      )
    );
});

// +++++++ TOGGLE COMMENT LIKE ++++++++
const toggleCommentLike = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;
  const { commentId } = req.params;

  // console.log("commentId *******", commentId);

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment Id !!!");
  }
  const commentExist = await Comment.findById(commentId);
  // console.log("commentExist ********", commentExist);

  if (!commentExist) {
    throw new ApiError(400, "Comment not found !!!");
  }

  const isCommentLiked = await Like.findOne({
    likedBy: currentUserId,
    comment: commentId,
  });

  // TOGGLE COMMENT LIKE
  let commentLikeStatus;

  if (!isCommentLiked) {
    await Like.create({
      comment: commentId,
      likedBy: currentUserId,
    });

    commentLikeStatus = { isCommentLiked: true };
  } else {
    await Like.findByIdAndDelete(isCommentLiked?._id);
    commentLikeStatus = { isCommentLiked: false };
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        commentLikeStatus,
        commentLikeStatus.isCommentLiked
          ? "You Liked the comment."
          : "You removed Like form the comment."
      )
    );
});

// +++++++++ GET CURENT USER'S ALL LIKED VIDEO +++++++++
const getUsersAllLikedVideos = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;

  const allLikedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(currentUserId),
        video: {
          $exists: true,
        },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $project: {
              videoFile: 1,
              thumbnail: 1,
              title: 1,
              description: 1,
              duration: 1,
              views: 1,
              owner: 1,
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
                    coverImage: 1,
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
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        allLikedVideos,
        "User's all liked videos fetched Successfully."
      )
    );
});

export {
  getVideoTotalLike,
  toggleVideoLike,
  getCommentTotalLike,
  toggleCommentLike,
  getUsersAllLikedVideos,
};

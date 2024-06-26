import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload an image
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // success message
    console.log(
      " 📸 File has uploaded successfully : upload cloudinary response ---",
      response
    );

    fs.unlinkSync(localFilePath); // remove locally saved temp file as the upload operation got failed.
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    // remove locally saved temp file as the upload operation got failed.
    console.log("File upload on cloudinary FAILED !!!", error?.message);
    return null;
  }
};

// ++++++++ DELETE IMAGE FILE FROM CLOUDINARY +++++++++
const deleteFromCloudinary = async (public_id) => {
  try {
    if (!public_id) {
      return null;
    }

    // DELETE IMG FILE
    const response = await cloudinary.uploader.destroy(public_id, {
      resource_type: "image",
    });

    console.log(
      " Old img/video file deleted Successfully .  Deletion file response ----",
      response
    );

    return response;
  } catch (error) {
    console.log(
      error?.message,
      "Img file deletion from cloudinary  FAILED !!!"
    );
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };

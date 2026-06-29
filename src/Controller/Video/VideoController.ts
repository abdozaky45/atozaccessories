import { Request, Response, NextFunction } from "express";
import {
  deletePresignedURL,
  extractMediaId,
} from "../../Service/CategoryService/CategoryService";
import {
  countVideos,
  createVideo,
  deleteVideoById,
  findVideoById,
  getVideo,
} from "../../Service/Video/VideoService";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import SuccessMessage from "../../Utils/SuccessMessages";
import ErrorMessages from "../../Utils/Error";
import Ivideo from "../../Model/Video/Ivideo";
// The homepage promo video is a singleton: only one may exist at a time. To swap
// it the admin must delete the current one first — there is intentionally no
// update endpoint, so a new upload can never silently orphan the old S3 object.
export const createOneVideo = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { videoUrl } = req.body;
    const existing = await countVideos();
    if (existing > 0) {
      throw new ApiError(409, ErrorMessages.VIDEO_ALREADY_EXISTS);
    }
    const videoData: Ivideo = {
      mediaUrl: videoUrl,
      mediaId: extractMediaId(videoUrl),
      createdBy: req.body.currentUser.userInfo._id,
    };
    const video = await createVideo(videoData);
    return res.json(
      new ApiResponse(200, { video }, SuccessMessage.VIDEO_CREATED)
    );
  }
);
export const getOneVideo = asyncHandler(async (req: Request, res: Response) => {
  const video = await getVideo();
  return res.json(
    new ApiResponse(200, { video }, SuccessMessage.VIDEO_FETCHED)
  );
});
export const deleteOneVideo = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const video = await findVideoById(id);
    if (!video) throw new ApiError(404, ErrorMessages.VIDEO_NOT_FOUND);
    // Delete by mediaUrl, not the stored mediaId: deletePresignedURL derives the
    // S3 key itself (via extractKey), which works for CloudFront URLs too.
    if (video.mediaUrl) {
      await deletePresignedURL(video.mediaUrl);
    }
    await deleteVideoById(id);
    return res.json(new ApiResponse(200, {}, SuccessMessage.VIDEO_DELETED));
  }
);

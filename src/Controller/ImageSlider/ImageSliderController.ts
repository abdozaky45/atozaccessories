import {
  deletePresignedURL,
  extractMediaId,
} from "../../Service/CategoryService/CategoryService";
import {
  createImageSlider,
  deleteImageSlider,
  findMediaId,
} from "../../Service/ImageSlider/ImageSliderService";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import { Request, Response, NextFunction } from "express";
import SuccessMessage from "../../Utils/SuccessMessages";
import ErrorMessages from "../../Utils/Error";
export const createHeroSection = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { image } = req.body;
    req.body.currentUser.i;
    const mediaId = extractMediaId(image);
    const media = await createImageSlider(
      image,
      mediaId,
      req.body.currentUser.userInfo._id
    );
  }
);
export const deleteHeroSection = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id, mediaId } = req.params;
    const media = await findMediaId(id);
    if (!media) throw new ApiError(404, ErrorMessages.IMAGE_NOT_FOUND);
    await deletePresignedURL(mediaId);
    await deleteImageSlider(id);
    return res.json(new ApiResponse(200, {}, SuccessMessage.IMAGE_DELETED));
  }
);

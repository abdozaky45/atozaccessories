import {
  deletePresignedURL,
  extractMediaId,
} from "../../Service/CategoryService/CategoryService";
import {
  createImageSlider,
  deleteImageSlider,
  findMediaId,
  getAllImageSlider,
} from "../../Service/ImageSlider/ImageSliderService";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import { Request, Response, NextFunction } from "express";
import SuccessMessage from "../../Utils/SuccessMessages";
import ErrorMessages from "../../Utils/Error";
export const createHeroSection = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { image } = req.body;
    const mediaId = extractMediaId(image);
    const media = await createImageSlider(
      image,
      mediaId,
      req.body.currentUser.userInfo._id
    );
    return res.json(
      new ApiResponse(200, { media }, SuccessMessage.IMAGE_SLIDER_CREATED)
    );
  }
);
export const deleteHeroSection = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { mediaId, id } = req.body;
    const media = await findMediaId(id);
    if (!media) throw new ApiError(404, ErrorMessages.IMAGE_NOT_FOUND);
    await deletePresignedURL(mediaId);
    await deleteImageSlider(id);
    return res.json(new ApiResponse(200, {}, SuccessMessage.IMAGE_DELETED));
  }
);
export const getHeroSection = asyncHandler(
  async (req: Request, res: Response) => {
    const imageSlider = await getAllImageSlider()
    return res.json(
      new ApiResponse(200, { imageSlider }, SuccessMessage.IMAGE_SLIDER_FETCHED)
    );
  }
);
export const getHeroSectionById = asyncHandler(
  async (req: Request, res: Response) => {
    const imageSlider = await findMediaId(req.params.id);
    if (!imageSlider) throw new ApiError(404, ErrorMessages.IMAGE_NOT_FOUND);
    return res.json(
      new ApiResponse(200, { imageSlider }, SuccessMessage.IMAGE_SLIDER_FETCHED)
    );
  }
);
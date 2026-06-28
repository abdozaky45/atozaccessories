import {
  deletePresignedURL,
  extractMediaId,
} from "../../Service/CategoryService/CategoryService";
import {
  createImageSlider,
  deleteImageSlider,
  findMediaId,
  getAllImageSlider,
  updateHeroSection,
} from "../../Service/ImageSlider/ImageSliderService";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import { Request, Response, NextFunction } from "express";
import SuccessMessage from "../../Utils/SuccessMessages";
import ErrorMessages from "../../Utils/Error";
import IimageSlider from "../../Model/ImageSlider/IimageSlider";
export const createHeroSection = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { images } = req.body;

    const imageSliderData: IimageSlider = {
      images: {
        image1: {
          mediaUrl: images.image1.imageUrl,
          mediaId: extractMediaId(images.image1.imageUrl),
          mediaType: images.image1.imageType,
        },
        image2: {
          mediaUrl: images.image2.imageUrl,
          mediaId: extractMediaId(images.image2.imageUrl),
          mediaType: images.image2.imageType,
        }
      },
      createdBy: req.body.currentUser.userInfo._id,
    }
    const media = await createImageSlider(imageSliderData);
    return res.json(
      new ApiResponse(200, { media }, SuccessMessage.IMAGE_SLIDER_CREATED)
    );
  }
);
export const updateOneHeroSection = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { images } = req.body;
    const { id } = req.params;
    const updatedImageSliderData: Partial<IimageSlider> = {
      images: {
        image1: {
          mediaUrl: images.image1.imageUrl,
          mediaId: extractMediaId(images.image1.imageUrl),
          mediaType: images.image1.imageType,
        },
        image2: {
          mediaUrl: images.image2.imageUrl,
          mediaId: extractMediaId(images.image2.imageUrl),
          mediaType: images.image2.imageType,
        },
      },
      createdBy: req.body.currentUser.userInfo._id,
    };
    const media = await updateHeroSection(updatedImageSliderData, id as string);
    if (!media) throw new ApiError(404, ErrorMessages.INVALID_UPDATE_HERO_SECTION);
    return res.json(
      new ApiResponse(200, { media }, SuccessMessage.IMAGE_UPDATED)
    );
  }
);
export const deleteHeroSection = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const {id} = req.params;
    const media = await findMediaId(id);
    if (!media) throw new ApiError(404, ErrorMessages.IMAGE_NOT_FOUND);
    // Delete by mediaUrl, not the stored mediaId: deleteFromS3 derives the S3
    // key itself (via extractKey), which works for CloudFront URLs and for any
    // legacy rows whose mediaId was never resolved correctly.
    const images = [media.images.image1, media.images.image2];
    await Promise.all(
      images
        .filter((image) => image?.mediaUrl)
        .map((image) => deletePresignedURL(image!.mediaUrl))
    );
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
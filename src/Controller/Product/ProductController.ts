import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";
import {
  extractMediaId,
  findCategoryById,
} from "../../Service/CategoryService/CategoryService";
import ProductInterFaceModel from "../../Model/Product/ProductInterFaceModel";
import slugify from "slugify";
import moment from "../../../src/Utils/DateAndTime";
import { createProduct, findProductById } from "../../Service/Product/ProductService";
import SuccessMessage from "../../Utils/SuccessMessages";
export const CreateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      productName,
      productDescription,
      price,
      availableItems,
      categoryId,
      salePrice,
      expiredSale,
      defaultImage,
      albumImages,
    } = req.body;
    if (
      !productName ||
      !productDescription ||
      !price ||
      !availableItems ||
      !categoryId ||
      !defaultImage
    )
      throw new ApiError(400, ErrorMessages.ALL_FIELDS_REQUIRED);
    const category = await findCategoryById(categoryId);
    if (!category) throw new ApiError(400, ErrorMessages.CATEGORY_NOT_FOUND);
    const mediaUrl = defaultImage;
    const mediaId = extractMediaId(defaultImage);
    const processedAlbumImages =
      albumImages?.map((image: any) => {
        return {
          mediaUrl: image,
          mediaId: extractMediaId(image),
        };
      }) || [];
    const productData: ProductInterFaceModel = {
      productName,
      slug: slugify(productName),
      productDescription,
      price,
      availableItems,
      salePrice,
      expiredSale,
      category: category._id,
      defaultImage: { mediaUrl, mediaId },
      albumImages: processedAlbumImages,
      createdBy: req.body.currentUser!.userInfo._id,
      createdAt: moment().valueOf(),
      updatedAt: moment().valueOf(),
    };
    const product = await createProduct(productData);
    res
      .status(201)
      .json(new ApiResponse(201, { product }, SuccessMessage.PRODUCT_CREATED));
  }
);
export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const Category = await findCategoryById(req.params.categoryId);
    if (!Category) throw new ApiError(400, ErrorMessages.CATEGORY_NOT_FOUND);
    if (
      req.body.currentUser.userInfo._id.toString() !==
      Category.createdBy.toString()
    ) {
      throw new ApiError(403, ErrorMessages.UNAUTHORIZED_ACCESS);
    }
    const product = await findProductById(req.params.productId);
    if(!product) throw new ApiError(400, ErrorMessages.PRODUCT_NOT_FOUND);
    

  }
);

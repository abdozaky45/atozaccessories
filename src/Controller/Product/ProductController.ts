import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";
import { findCategoryById } from "../../Service/CategoryService/CategoryService";
import ProductInterFaceModel from "../../Model/Product/ProductInterFaceModel";
import slugify from "slugify";
import moment from "../../../src/Utils/DateAndTime";
import { createProduct } from "../../Service/Product/ProductService";
import SuccessMessage from "../../Utils/SuccessMessages";
export const CreateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    /*
*productName
*productDescription
*price
*availableItems
*Category
*defaultImage
salePrice
expiredSale
albumImages
 */
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
    const productData: ProductInterFaceModel = {
      productName,
      slug: slugify(productName),
      productDescription,
      price,
      availableItems,
      salePrice,
      expiredSale,
      category: category._id,
      defaultImage,
      albumImages,
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

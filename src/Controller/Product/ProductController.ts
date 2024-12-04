import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";
import {
  deletePresignedURL,
  extractMediaId,
  findCategoryById,
} from "../../Service/CategoryService/CategoryService";
import ProductInterFaceModel from "../../Model/Product/ProductInterFaceModel";
import slugify from "slugify";
import moment from "../../../src/Utils/DateAndTime";
import {
  createProduct,
  deleteOneProduct,
  findAllProducts,
  findAllSaleProducts,
  findProductById,
  prepareProductUpdates,
} from "../../Service/Product/ProductService";
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
    const {
      productName,
      productDescription,
      price,
      availableItems,
      salePrice,
      expiredSale,
      category,
      defaultImage,
      albumImages,
    } = req.body;
    const { productId } = req.params;
    const product = await findProductById(productId);
    if (!product) throw new ApiError(400, ErrorMessages.PRODUCT_NOT_FOUND);
    const Category = await findCategoryById(category);
    if (!Category) throw new ApiError(400, ErrorMessages.CATEGORY_NOT_FOUND);
    if (
      req.body.currentUser.userInfo._id.toString() !==
      product.createdBy.toString()
    ) {
      throw new ApiError(403, ErrorMessages.UNAUTHORIZED_ACCESS);
    }
    const productData = {
      productName,
      productDescription,
      price,
      availableItems,
      salePrice,
      expiredSale,
      category,
      defaultImage,
      albumImages,
    };
    const updates = await prepareProductUpdates(productData, product);
    if (updates) {
      await product.save();
      return res.json(
        new ApiResponse(200, { product }, SuccessMessage.PRODUCT_UPDATED)
      );
    }
    return res.json(
      new ApiResponse(200, {}, SuccessMessage.PRODUCT_NOT_UPDATED)
    );
  }
);
export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId } = req.params;
    const product = await findProductById(productId);
    if (!product) throw new ApiError(400, ErrorMessages.PRODUCT_NOT_FOUND);
    if (
      req.body.currentUser.userInfo._id.toString() !==
      product.createdBy.toString()
    )
      throw new ApiError(403, ErrorMessages.UNAUTHORIZED_ACCESS);
    const mediaIds = [
      product.defaultImage.mediaId,
      ...(product.albumImages?.map((image) => image.mediaId) || []),
    ];
    await Promise.all(
      mediaIds.map(async (mediaId) => {
        await deletePresignedURL(mediaId);
      })
    );
    await deleteOneProduct(productId);
    return res.json(new ApiResponse(200, {}, SuccessMessage.PRODUCT_DELETED));
  }
);
export const getProductById = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId } = req.params;
    const product = await findProductById(productId);
    if (!product) throw new ApiError(400, ErrorMessages.PRODUCT_NOT_FOUND);
    return res.json(new ApiResponse(200, { product }, ""));
  }
);
export const getAllProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const { page } = req.query;
    const pageNumber = Number(page);
    const products = await findAllProducts(pageNumber);
    return res.json(new ApiResponse(200, { products }, ""));
  }
);
export const getAllSaleProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const { page } = req.query;
    const pageNumber = Number(page);
    const products = await findAllSaleProducts(pageNumber);
    return res.json(new ApiResponse(200, { products }, ""));
  }
);

import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";
import {
  deletePresignedURL,
  extractMediaId,
  findCategoryById,
} from "../../Service/CategoryService/CategoryService";
import IProduct from "../../Model/Product/IProduct";
import slugify from "slugify";
import moment from "../../Utils/DateAndTime";
import {
  createProduct,
  deleteOneProduct,
  findAllProducts,
  findAllSaleProducts,
  findProductById,
  findProductByPriceRange,
  findProductBySort,
  findProducts,
  prepareProductUpdates,
  productSearch,
  ratioCalculatePrice,
} from "../../Service/Product/ProductService";
import SuccessMessage from "../../Utils/SuccessMessages";
import { scheduleProductUpdate } from "../../Utils/scheduledBull";
import { getProductWishlist } from "../../Service/Wishlist/WishlistService";
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
    const finalPrices = await ratioCalculatePrice(price, salePrice);
    const productData: IProduct = {
      productName,
      slug: slugify(productName),
      productDescription,
      price,
      availableItems,
      salePrice,
      discount: finalPrices?.discount,
      discountPercentage: finalPrices?.discountPercentage,
      isSale: finalPrices?.isSale,
      expiredSale,
      category: category._id,
      defaultImage: { mediaUrl, mediaId },
      albumImages: processedAlbumImages,
      createdBy: req.body.currentUser!.userInfo._id,
      createdAt: moment().valueOf(),
    };
    const product = await createProduct(productData);
    if(expiredSale){
      console.log("======here============");
      scheduleProductUpdate(product._id.toString(), expiredSale);
    }
    return res
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
    const productData: Partial<IProduct> = {
      productName,
      productDescription,
      price,
      availableItems,
      salePrice,
      expiredSale,
      category,
    };

    let finalPrices;
    if (price !== undefined || salePrice !== undefined) {
      const currentPrice = price !== undefined ? price : product.price;
      const currentSalePrice =
        salePrice !== undefined ? salePrice : product.salePrice;
      finalPrices = await ratioCalculatePrice(currentPrice, currentSalePrice);
      productData.discount = finalPrices.discount;
      productData.discountPercentage = finalPrices.discountPercentage;
      productData.isSale = finalPrices.isSale;
    }

    const updates = await prepareProductUpdates(
      productData,
      product,
      defaultImage,
      albumImages
    );
    if (updates) {
      await product.save();
      if(expiredSale){
        scheduleProductUpdate(productId, expiredSale);
      }
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
    const { user } = req.query;
    const product = await findProductById(productId);
    if (!product) throw new ApiError(400, ErrorMessages.PRODUCT_NOT_FOUND);
    let liked = false;
    if(user){
      const wishlistEntry = await getProductWishlist(productId,user as string);
      liked = wishlistEntry ? true : false;
    }
    return res.json(new ApiResponse(200, { product ,liked}, ""));
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
export const SearchProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const { searchQuery } = req.query;
    const products = await productSearch(searchQuery as string);
    return res.json(new ApiResponse(200, { products }, "Success"));
  }
);
export const sortProduct = asyncHandler(async (req: Request, res: Response) => {
  const { page, sort } = req.query;
  const pageNumber = Number(page);
  const products = await findProductBySort(sort as string, pageNumber);
  return res.json(new ApiResponse(200, { products }, "Success"));
});
export const sortProductByPrice = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, sort } = req.query;
    const pageNumber = Number(page);
    const products = await findProductByPriceRange(sort as string, pageNumber);
    return res.json(new ApiResponse(200, { products }, "Success"));
  }
);
export const sortProductByRangeAndPrice = asyncHandler(async (req: Request, res: Response) => {
   const { page, sort, priceRange } = req.query;
  const pageNumber = Number(page);
  const products = await findProducts(sort as string, priceRange as string, pageNumber);
  return res.json(new ApiResponse(200, { products }, "Success"));
});

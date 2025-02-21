import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";
import {
  extractMediaId,
  findCategoryById,
} from "../../Service/CategoryService/CategoryService";
import slugify from "slugify";
import moment from "../../Utils/DateAndTime";
import {
  createProduct,
  deleteOneProduct,
  findAllProducts,
  findAllProductsByCategory,
  findAllSaleProducts,
  findProductById,
  findProductByPriceRange,
  findProductBySoldOut,
  findProductBySort,
  findProducts,
  getAnalytics,
  getAvailableItems,
  prepareProductUpdates,
  productSearch,
  ratioCalculatePrice,
} from "../../Service/Product/ProductService";
import SuccessMessage from "../../Utils/SuccessMessages";
import { getProductWishlist } from "../../Service/Wishlist/WishlistService";
import IProduct from "../../Model/Product/Iproduct";
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
      categoryId,
      defaultImage,
      albumImages,
    } = req.body;
    const { productId } = req.params;
    const product = await findProductById(productId);
    if (!product) throw new ApiError(400, ErrorMessages.PRODUCT_NOT_FOUND);
    const Category = await findCategoryById(categoryId);
    if (!Category) throw new ApiError(400, ErrorMessages.CATEGORY_NOT_FOUND);
    const productData: Partial<IProduct> = {
      productName,
      productDescription,
      price,
      availableItems,
      salePrice,
      expiredSale,
      category: categoryId,
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
    if (user) {
      const wishlistEntry = await getProductWishlist(productId, user as string);
      liked = wishlistEntry ? true : false;
    }
    return res.json(new ApiResponse(200, { product, liked }, ""));
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
export const getProductBySoldOut = asyncHandler(async (req: Request, res: Response) => {
  const { page } = req.query;
  const pageNumber = Number(page);
  const products = await findProductBySoldOut(pageNumber);
  return res.json(new ApiResponse(200, { products }, "Success"));
});
export const getAllProductsByCategoryId = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const { sort, priceRange ,page } = req.query;
  const pageNumber = Number(page);
  const checkCategory = await findCategoryById(categoryId);
  if (!checkCategory) throw new ApiError(400, ErrorMessages.CATEGORY_NOT_FOUND);
  const products = await findAllProductsByCategory(sort as string, priceRange as string, pageNumber,categoryId);
  return res.json(new ApiResponse(200, { products }, ""));
});
export const getAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const analysis = await getAnalytics();
  return res.json(new ApiResponse(200, { analysis }, "Success"));
});
export const getProductsAndAvailableItems = asyncHandler(async (req: Request, res: Response) => {
  const products = req.body.products;
  const result = await getAvailableItems(products);
  const response: Record<string, number> = {};
  result.forEach(product => {
        response[product._id.toString()] = product.availableItems;
    });
    return res.json(response);
});

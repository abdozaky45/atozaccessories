import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";
import { extractMediaId, findCategoryById } from "../../Service/CategoryService/CategoryService";
import slugify from "slugify";
import moment from "../../Utils/DateAndTime";
import {
  createProduct,
  createVariants,
  deleteOneProduct,
  deleteVariantById,
  findProductByIdAdmin,
  findProductByIdPublic,
  findProductById,
  getAdminProducts,
  getAnalytics,
  getAvailableItems,
  getProducts,
  hardDeleteProduct,
  prepareProductUpdates,
  productSearch,
  ratioCalculatePrice,
  syncProductStockFromVariants,
  upsertVariants,
} from "../../Service/Product/ProductService";
import SuccessMessage from "../../Utils/SuccessMessages";
import { getProductWishlist } from "../../Service/Wishlist/WishlistService";
import IProduct from "../../Model/Product/Iproduct";
import { cacheDel } from "../../Utils/Cache";
import { CacheKeys } from "../../Utils/Cache/keys";

// ─── Admin: Create ────────────────────────────────────────────────────────────

export const CreateProduct = asyncHandler(async (req: Request, res: Response) => {
  const {
    productName,
    productDescription,
    price,
    categoryId,
    salePrice,
    defaultImage,
    albumImages,
    wholesalePrice,
    isBestSeller,
    variants,
  } = req.body;

  const category = await findCategoryById(categoryId);
  if (!category) throw new ApiError(400, ErrorMessages.CATEGORY_NOT_FOUND);

  // Stock is owned by the variants; the product-level figure is their sum.
  const availableItems = (variants as Array<{ availableItems: number }>).reduce(
    (sum, v) => sum + (Number(v.availableItems) || 0),
    0
  );

  const mediaUrl = defaultImage;
  const mediaId = extractMediaId(defaultImage);
  const processedAlbumImages =
    albumImages?.map((image: any) => ({
      mediaUrl: image,
      mediaId: extractMediaId(image),
    })) || [];

  const finalPrices = await ratioCalculatePrice(price, salePrice);
  const finalPrice = salePrice ? salePrice : price;

  if (wholesalePrice !== undefined && wholesalePrice !== null && wholesalePrice >= finalPrice) {
    throw new ApiError(400, "wholesalePrice must be less than the final selling price");
  }

  const productData: IProduct = {
    productName,
    slug: slugify(productName),
    productDescription,
    price,
    availableItems,
    isSoldOut: availableItems <= 0,
    salePrice,
    discount: finalPrices?.discount,
    discountPercentage: finalPrices?.discountPercentage,
    isSale: finalPrices?.isSale,
    wholesalePrice,
    isBestSeller: isBestSeller ?? false,
    finalPrice,
    category: category._id,
    defaultImage: { mediaUrl, mediaId },
    albumImages: processedAlbumImages,
    createdBy: req.body.currentUser!.userInfo._id,
    createdAt: moment().valueOf(),
  };

  const product = await createProduct(productData);

  await createVariants(product._id, variants);
  // Authoritative recompute from the persisted variant docs.
  await syncProductStockFromVariants(product._id);

  await cacheDel(CacheKeys.home);
  return res.status(201).json(new ApiResponse(201, { product }, SuccessMessage.PRODUCT_CREATED));
});

// ─── Admin: Update ────────────────────────────────────────────────────────────

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const {
    productName,
    productDescription,
    price,
    salePrice,
    categoryId,
    defaultImage,
    albumImages,
    wholesalePrice,
    isBestSeller,
    variants,
  } = req.body;
  const { id } = req.params;

  const product = await findProductById(id);
  if (!product) throw new ApiError(400, ErrorMessages.PRODUCT_NOT_FOUND);

  const Category = await findCategoryById(categoryId);
  if (!Category) throw new ApiError(400, ErrorMessages.CATEGORY_NOT_FOUND);

  // availableItems is derived from variants (synced below), never set directly.
  const productData: Partial<IProduct> = {
    productName,
    productDescription,
    price,
    salePrice,
    category: categoryId,
    wholesalePrice,
    isBestSeller,
  };

  // When marked as a best seller, lock it to manual control
  if (isBestSeller === true) {
    productData.bestSellerManual = true;
  }

  let finalPrices;
  if (price !== undefined || salePrice !== undefined) {
    const currentPrice = price !== undefined ? price : product.price;
    const currentSalePrice = salePrice !== undefined ? salePrice : product.salePrice;
    finalPrices = await ratioCalculatePrice(currentPrice, currentSalePrice);
    productData.discount = finalPrices.discount;
    productData.discountPercentage = finalPrices.discountPercentage;
    productData.isSale = finalPrices.isSale;
  }

  // Recompute finalPrice on every update
  const effectivePrice = price !== undefined ? price : product.price;
  const effectiveSalePrice = salePrice !== undefined ? salePrice : product.salePrice;
  const finalPrice = effectiveSalePrice ? effectiveSalePrice : effectivePrice;
  productData.finalPrice = finalPrice;

  const effectiveWholesalePrice =
    wholesalePrice !== undefined ? wholesalePrice : product.wholesalePrice;
  if (
    effectiveWholesalePrice !== undefined &&
    effectiveWholesalePrice !== null &&
    effectiveWholesalePrice >= finalPrice
  ) {
    throw new ApiError(400, "wholesalePrice must be less than the final selling price");
  }

  const updates = await prepareProductUpdates(productData, product, defaultImage, albumImages);
  if (updates) {
    await product.save();
  }

  if (variants?.length) {
    await upsertVariants(product._id as any, variants);
    // Variant stock changed → product total is the sum of ALL its variants
    // (newly added ones included). Reflect the fresh total on the response too.
    const total = await syncProductStockFromVariants(product._id);
    product.availableItems = total;
    product.isSoldOut = total <= 0;
  }

  if (updates || variants?.length) {
    await cacheDel(CacheKeys.home);
    return res.json(new ApiResponse(200, { product }, SuccessMessage.PRODUCT_UPDATED));
  }
  return res.json(new ApiResponse(200, {}, SuccessMessage.PRODUCT_NOT_UPDATED));
});

// ─── Admin: Soft delete ───────────────────────────────────────────────────────

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await findProductById(id);
  if (!product) throw new ApiError(400, ErrorMessages.PRODUCT_NOT_FOUND);
  await deleteOneProduct(id);
  await cacheDel(CacheKeys.home);
  return res.json(new ApiResponse(200, {}, SuccessMessage.PRODUCT_DELETED));
});

// ─── Admin: Hard delete ───────────────────────────────────────────────────────

export const hardDelete = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await hardDeleteProduct(id);
  if (!result) throw new ApiError(400, ErrorMessages.PRODUCT_NOT_FOUND);
  await cacheDel(CacheKeys.home);
  return res.json(new ApiResponse(200, {}, SuccessMessage.PRODUCT_HARD_DELETED));
});

// ─── Admin: Delete variant ────────────────────────────────────────────────────

export const deleteVariant = asyncHandler(async (req: Request, res: Response) => {
  const { variantId } = req.params;
  const variant = await deleteVariantById(variantId);
  if (!variant) throw new ApiError(400, ErrorMessages.VARIANT_NOT_FOUND);
  // Removing a variant changes the product-level stock total.
  await syncProductStockFromVariants(variant.product);
  await cacheDel(CacheKeys.home);
  return res.json(new ApiResponse(200, {}, SuccessMessage.VARIANT_DELETED));
});

// ─── Admin: Get products list ─────────────────────────────────────────────────

export const getAdminProductsList = asyncHandler(async (req: Request, res: Response) => {
  const { category, isBestSeller, minPrice, maxPrice, color, size, isDeleted, search, sort, page, limit } = req.query;

  const result = await getAdminProducts({
    category: category as string,
    isBestSeller: isBestSeller !== undefined ? isBestSeller === "true" : undefined,
    minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
    maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
    color: color as string,
    size: size as string,
    isDeleted: isDeleted !== undefined ? isDeleted === "true" : undefined,
    search: search as string,
    sort: sort as string,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });

  return res.json(new ApiResponse(200, result, ""));
});

// ─── Admin: Get single product ────────────────────────────────────────────────

export const getAdminProductById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await findProductByIdAdmin(id);
  if (!product) throw new ApiError(400, ErrorMessages.PRODUCT_NOT_FOUND);
  return res.json(new ApiResponse(200, { product }, ""));
});

// ─── Admin: Analytics ─────────────────────────────────────────────────────────

export const getAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const analysis = await getAnalytics();
  return res.json(new ApiResponse(200, { analysis }, "Success"));
});

// ─── Public: Unified product list ────────────────────────────────────────────

export const getProductsList = asyncHandler(async (req: Request, res: Response) => {
  const { category, isBestSeller, isSale, minPrice, maxPrice, color, size, sort, page, limit } = req.query;

  const result = await getProducts({
    category: category as string,
    isBestSeller: isBestSeller !== undefined ? isBestSeller === "true" : undefined,
    isSale: isSale !== undefined ? isSale === "true" : undefined,
    minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
    maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
    color: color as string,
    size: size as string,
    sort: sort as string,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });

  return res.json(new ApiResponse(200, result, ""));
});

// ─── Public: Get single product ───────────────────────────────────────────────

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { user } = req.query;
  const product = await findProductByIdPublic(id);
  if (!product) throw new ApiError(400, ErrorMessages.PRODUCT_NOT_FOUND);
  let liked = false;
  if (user) {
    const wishlistEntry = await getProductWishlist(id, user as string);
    liked = wishlistEntry ? true : false;
  }
  return res.json(new ApiResponse(200, { product, liked }, ""));
});

// ─── Public: Search ───────────────────────────────────────────────────────────

export const SearchProducts = asyncHandler(async (req: Request, res: Response) => {
  const { searchQuery } = req.query;
  const products = await productSearch(searchQuery as string);
  return res.json(new ApiResponse(200, { products }, "Success"));
});

// ─── Public: Available items check (used by order system) ────────────────────

export const getProductsAndAvailableItems = asyncHandler(async (req: Request, res: Response) => {
  const products = req.body.products;
  const result = await getAvailableItems(products);
  const response: Record<string, number> = {};
  result.forEach((product) => {
    response[product._id.toString()] = product.availableItems;
  });
  return res.json(response);
});

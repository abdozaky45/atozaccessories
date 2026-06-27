import slugify from "slugify";
import CategoryModel from "../../Model/Categories/CategoryModel";
import ProductModel from "../../Model/Product/ProductModel";
import ProductVariantModel from "../../Model/ProductVariant/ProductVariantModel";
import { Types } from "mongoose";
import { deleteFromS3 } from "../../Utils/S3";

export const createCategory = async ({
  categoryName,
  mediaUrl,
  mediaId,
  createdBy,
  createdAt,
  icon_id,
}: {
  categoryName: string;
  mediaUrl: string;
  mediaId: string;
  createdBy: Types.ObjectId;
  createdAt: number;
  icon_id?: string | null;
}) => {
  const category = await CategoryModel.create({
    categoryName,
    image: { mediaUrl, mediaId },
    slug: slugify(categoryName),
    createdBy,
    createdAt,
    icon_id: icon_id ?? null,
  });
  return category;
};

export const extractMediaId = (imageUrl: string) => {
  if (!imageUrl.includes("amazonaws.com/")) {
    return "Invalid image url";
  }
  const mediaId = imageUrl.split("amazonaws.com/")[1];
  return mediaId;
};

export const findCategoryById = async (_id: string) => {
  const category = await CategoryModel.findById(_id).populate("icon_id", "_id key svg");
  return category;
};

export const deletePresignedURL = async (fileName: string) => {
  return deleteFromS3(fileName);
};

export const prepareCategoryUpdates = async (
  category: any,
  categoryName?: string,
  imageUrl?: string,
  icon_id?: string | null
) => {
  let updated = false;
  if (categoryName && categoryName !== category.categoryName) {
    category.categoryName = categoryName;
    category.slug = slugify(categoryName);
    updated = true;
  }
  if (imageUrl && imageUrl !== category.image.mediaUrl) {
    const mediaId = extractMediaId(imageUrl);
    if (mediaId !== category.image.mediaId) {
      category.image.mediaUrl = imageUrl;
      category.image.mediaId = mediaId;
      updated = true;
    }
  }
  if (icon_id !== undefined && String(category.icon_id ?? "") !== String(icon_id ?? "")) {
    category.icon_id = icon_id;
    updated = true;
  }
  return updated ? category : null;
};

export const deleteCategory = async (_id: string) => {
  const category = await CategoryModel.findByIdAndUpdate(_id, { isDeleted: true });
  return category;
};

export const getAllCategories = async () => {
  const categories = await CategoryModel.find({ isDeleted: false })
    .select("-isDeleted -__v")
    .populate("icon_id", "_id key svg");
  return categories;
};

// Admin only — soft-deleted categories (isDeleted: true). No pagination (small dataset).
export const getDeletedCategories = async () => {
  const categories = await CategoryModel.find({ isDeleted: true })
    .select("-__v")
    .populate("icon_id", "_id key svg")
    .sort({ createdAt: -1 });
  return categories;
};

export const hardDeleteCategory = async (categoryId: string) => {
  // Step 1 — Find all active products belonging to this category (for S3 cleanup)
  const activeProducts = await ProductModel.find({ category: categoryId, isDeleted: false });

  // Also find ALL product IDs (including soft-deleted) for complete DB cleanup
  const allProductDocs = await ProductModel.find({ category: categoryId }, { _id: 1 }).lean();
  const allProductIds = allProductDocs.map((p) => p._id);

  let deletedImages = 0;

  // Step 2 — Delete all S3 images for active products
  // If any S3 deletion fails this will throw, stopping execution before any DB changes
  for (const product of activeProducts) {
    if (product.defaultImage?.mediaUrl) {
      await deleteFromS3(product.defaultImage.mediaUrl);
      deletedImages++;
    }
    if (product.albumImages?.length) {
      for (const img of product.albumImages) {
        await deleteFromS3(img.mediaUrl);
        deletedImages++;
      }
    }
  }

  // Step 3 — Delete all ProductVariant documents linked to products in this category
  const variantResult = allProductIds.length
    ? await ProductVariantModel.deleteMany({ product: { $in: allProductIds } })
    : { deletedCount: 0 };
  const deletedVariants = variantResult.deletedCount ?? 0;

  // Step 4 — Delete all Product documents linked to this category
  const productResult = await ProductModel.deleteMany({ category: categoryId });
  const deletedProducts = productResult.deletedCount ?? 0;

  // Step 5 — Delete the Category document itself
  await CategoryModel.findByIdAndDelete(categoryId);

  return { deletedProducts, deletedVariants, deletedImages };
};

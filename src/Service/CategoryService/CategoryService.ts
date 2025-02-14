import slugify from "slugify";
import CategoryModel from "../../Model/Categories/CategoryModel";
import { Types } from "mongoose";
import s3_service from "../Aws/S3_Bucket/presignedUrl";
export const createCategory = async ({
  categoryName,
  mediaUrl,
  mediaId,
  createdBy,
  createdAt,
}: {
  categoryName: string;
  mediaUrl: string;
  mediaId: string;
  createdBy: Types.ObjectId;
  createdAt: number;
}) => {
  const category = await CategoryModel.create({
    categoryName,
    image: {
      mediaUrl,
      mediaId,
    },
    slug: slugify(categoryName),
    createdBy,
    createdAt,
  });
  return category;
};
export const extractMediaId =(imageUrl: string) => {
  if (!imageUrl.includes("amazonaws.com/")) {
    return "Invalid image url";
  }
  const mediaId = imageUrl.split("amazonaws.com/")[1];
  return mediaId;
};
export const findCategoryById = async (_id: string) => {
  const category = await CategoryModel.findById(_id);
  return category;
};
export const deletePresignedURL = async (fileName: string) => {
  const aws_s3_service = new s3_service();
  const deleteImage = await aws_s3_service.deletePresignedUrl({
    bucket: process.env.AWS_BUCKET_NAME!,
    key: fileName as string,
  });
  return deleteImage;
};
export const prepareCategoryUpdates = async (
  category: any,
  categoryName?: string,
  imageUrl?: string
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
  return updated ? category : null;
};
export const deleteCategory = async (_id: string) => {
  const category = await CategoryModel.findByIdAndUpdate(_id , {isDeleted:true});
  return category;
};
export const getAllCategories = async () => {
  const categories = await CategoryModel.find({isDeleted:false}).select("-isDeleted -__v");
  return categories;
};

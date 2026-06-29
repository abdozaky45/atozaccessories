import s3_service from "../../Service/Aws/S3_Bucket/presignedUrl";
import { extractKey } from "../Cdn";

const s3 = new s3_service();

export const deleteFromS3 = async (imageUrl: string) => {
  // Handles CloudFront and S3 URLs, and keeps the full key incl. folder prefix
  // (e.g. "imageSlider/abc_123_0") instead of just the last path segment.
  const key = extractKey(imageUrl);
  await s3.deletePresignedUrl({ bucket: process.env.AWS_BUCKET_NAME!, key });
};

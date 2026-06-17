import s3_service from "../../Service/Aws/S3_Bucket/presignedUrl";

const s3 = new s3_service();

export const deleteFromS3 = async (imageUrl: string) => {
  const key = imageUrl.split("/").pop()!;
  await s3.deletePresignedUrl({ bucket: process.env.AWS_BUCKET_NAME!, key });
};

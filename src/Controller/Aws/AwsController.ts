import { Request, Response } from "express";
import { ApiResponse, ApiError, asyncHandler } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";
import s3_service from "../../Service/Aws/S3_Bucket/presignedUrl";
export const getPresignedURL = asyncHandler(
  async (req: Request, res: Response) => {
    const regionAws = process.env.AWS_REGION!;
    const bucketName = process.env.AWS_BUCKET_NAME!;
    const files = Array.isArray(req.body.files)
      ? req.body.files
      : [req.body.files];
    if (!files || files.length === 0) {
      throw new ApiError(400, ErrorMessages.NO_FILES_PROVIDED);
    }
    const aws_s3_service = new s3_service();
    const preSignedURLs = await Promise.all(
      files.map(async (file: any, index: number) => {
        const fileName = `${req.body.fileName}/${
          req.body.currentUser.userInfo._id
        }_${Date.now()}_${index}`;
        const preSignedURL = await aws_s3_service.createPresignedUrlWithClient({
          region: regionAws,
          bucket: bucketName,
          key: fileName,
          contentType: file.contentType || "image/jpeg",
        });
        return {
          preSignedURL,
          mediaUrl: preSignedURL.split("?")[0],
        };
      })
    );

    return res.json(
      new ApiResponse(200, {
        preSignedURLs,
      })
    );
  }
);
export const deleteImage = asyncHandler(async (req: Request, res: Response) => {
  const { fileName } = req.query;
  const bucketName = process.env.AWS_BUCKET_NAME!;
  if (!fileName) {
    throw new ApiError(400, ErrorMessages.INVALID_FILE_NAME);
  }
  const aws_s3_service = new s3_service();
  const deletePresignedURL = await aws_s3_service.deletePresignedUrl({
    bucket: bucketName,
    key: fileName as string,
  });
  return res.json(new ApiResponse(200, deletePresignedURL));
});

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
dotenv.config;

const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
export default class s3_service {
  createPresignedUrlWithClient = async ({
    bucket,
    key,
    contentType,
  }: {
    region: string;
    bucket: string;
    key: string;
    contentType: string;
  }) => {
    // No ACL: the bucket has ACLs disabled (Bucket owner enforced) and is
    // private behind CloudFront (OAC). Sending an ACL would fail the upload.
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    return await getSignedUrl(client, command, { expiresIn: 360000 });
  };
  deletePresignedUrl = async ({
    bucket,
    key,
  }: {
    bucket: string;
    key: string;
  }) => {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    try {
      const data = await client.send(command);
      return data;
    } catch (error) {
      console.error("Error deleting file from S3:", error);
      throw new Error("Error deleting file from S3");
    }
  };
}

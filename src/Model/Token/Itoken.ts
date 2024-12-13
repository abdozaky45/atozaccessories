import { Types } from "mongoose";

export default interface Itoken {
  refreshToken: string;
  accessToken: string;
  userAgent: string;
  user: Types.ObjectId | string;
  createdAt: Date;
  expiresAt: Date;
}

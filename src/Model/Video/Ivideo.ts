import { Types } from "mongoose";
export default interface Ivideo {
  mediaUrl: string;
  mediaId: string;
  createdBy: Types.ObjectId | string;
}

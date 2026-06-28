import { Schema, model } from "mongoose";
import Ivideo from "./Ivideo";
import { ImageSchema, RefType } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
// Homepage promo video. Enforced as a singleton at the service/controller level:
// only one document is ever allowed to exist (see VideoController.createVideo).
const VideoSchema = new Schema<Ivideo>(
  {
    ...ImageSchema, // mediaUrl + mediaId (S3 key) — same media shape as the rest of the app
    createdBy: RefType(SchemaTypesReference.User, true),
  },
  { timestamps: true }
);
const VideoModel = model(SchemaTypesReference.Video, VideoSchema);
export default VideoModel;

import Ivideo from "../../Model/Video/Ivideo";
import VideoModel from "../../Model/Video/VideoModel";
export const createVideo = async (videoData: Ivideo) => {
  const video = await VideoModel.create(videoData);
  return video;
};
// The promo video is a singleton, so the single document is the whole resource.
export const getVideo = async () => {
  const video = await VideoModel.findOne();
  return video;
};
export const countVideos = async () => {
  const count = await VideoModel.countDocuments();
  return count;
};
export const findVideoById = async (_id: string) => {
  const video = await VideoModel.findById(_id);
  return video;
};
export const deleteVideoById = async (_id: string) => {
  const video = await VideoModel.deleteOne({ _id });
  return video;
};

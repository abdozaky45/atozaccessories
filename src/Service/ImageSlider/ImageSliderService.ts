import IimageSlider from "../../Model/ImageSlider/IimageSlider";
import ImageSliderModel from "../../Model/ImageSlider/ImageSliderModel";
import { Types } from "mongoose";
export const createImageSlider = async (imageSliderData: IimageSlider) => {
    const imageSlider = await ImageSliderModel.create(imageSliderData);
    return imageSlider;
}
export const updateHeroSection = async (imageSliderData: Partial<IimageSlider>, id: Types.ObjectId | string) => {
    const updatedHeroSection = await ImageSliderModel.findByIdAndUpdate(
        id,
        imageSliderData,
        { new: true, runValidators: true }
    );
    return updatedHeroSection;
}
export const findMediaId = async (_id: string) => {
    const imageSlider = await ImageSliderModel.findById(_id);
    return imageSlider;
}
export const deleteImageSlider = async (_id: string) => {
    const imageSlider = await ImageSliderModel.deleteOne({ _id });
    return imageSlider;
}
export const getAllImageSlider = async () => {
    const imageSlider = await ImageSliderModel.find();
    return imageSlider;
}   
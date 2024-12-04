import ImageSliderModel from "../../Model/ImageSlider/ImageSliderModel";

export const createImageSlider =  async (imageUrl:string,mediaId:string,createdBy:string) => {
    const imageSlider = await ImageSliderModel.create({
        image:{imageUrl,mediaId},
        createdBy
    })
    return imageSlider;
}
export const findMediaId = async (_id:string) => {
    const imageSlider = await ImageSliderModel.findById(_id);
    return imageSlider;
}
export const deleteImageSlider = async (_id: string) => {
    const imageSlider = await ImageSliderModel.deleteOne({_id});
    return imageSlider;
}

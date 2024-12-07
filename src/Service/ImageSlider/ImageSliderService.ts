import ImageSliderModel from "../../Model/ImageSlider/ImageSliderModel";
export const createImageSlider =  async (mediaUrl:string,mediaId:string,createdBy:string) => {
    const imageSlider = await ImageSliderModel.create({
        image:{mediaUrl,mediaId},
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
export const getAllImageSlider = async () => {
    const imageSlider = await ImageSliderModel.find();
    return imageSlider;
}   
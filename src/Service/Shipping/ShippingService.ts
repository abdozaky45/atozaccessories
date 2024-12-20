import IShipping from "../../Model/Shipping/IShipping";
import ShippingModel from "../../Model/Shipping/ShippingModel";
import { Types } from "mongoose";
export const createShipping = async (ShippingData: IShipping) => {
    const Shipping = await ShippingModel.create(ShippingData);
    return Shipping;
}
export const getShipping = async () => {
    const Shipping = await ShippingModel.find();
    return Shipping;
}
export const getShippingById = async (ShippingId: Types.ObjectId | string) => {
    const Shipping = await ShippingModel.findById(ShippingId);
    return Shipping;
}
export const updateShipping = async (ShippingId: Types.ObjectId | string, ShippingData: IShipping) => {
    const Shipping = await ShippingModel.findByIdAndUpdate(ShippingId, ShippingData);
    return Shipping;
}
export const deleteShipping = async (ShippingId: Types.ObjectId | string) => {
    const Shipping = await ShippingModel.findByIdAndDelete(ShippingId);
    return Shipping;
}
import IShipping from "../../Model/Shipping/Ishipping";
import ShippingModel from "../../Model/Shipping/ShippingModel";
import { Types } from "mongoose";
class ShippingService {

    async createShipping(ShippingData: Omit<IShipping, "isDeleted">) {
        const Shipping = await ShippingModel.create(ShippingData);
        return Shipping;
    }
    async getShipping() {
        const Shipping = await ShippingModel.find({isDeleted:false}).select("-isDeleted -__v");
        return Shipping;
    }
    async getShippingById(ShippingId: Types.ObjectId | string): Promise<(IShipping & { _id: Types.ObjectId }) | null> {
        const Shipping = await ShippingModel.findById(ShippingId);
        return Shipping;
    }
    async updateShipping(ShippingId: Types.ObjectId | string, ShippingData: Omit<IShipping,"isDeleted">) {
        const Shipping = await ShippingModel.findByIdAndUpdate(ShippingId, {
            $set: ShippingData
        }, { new: true }
        );
        return Shipping;
    }
    async deleteShipping(ShippingId: Types.ObjectId | string) {
        const Shipping = await ShippingModel.findByIdAndUpdate(ShippingId,{isDeleted:true});
        return Shipping;
    }
}
export default new ShippingService();
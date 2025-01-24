import IShipping from "../../Model/Shipping/Ishipping";
import ShippingModel from "../../Model/Shipping/ShippingModel";
import { Types } from "mongoose";
class ShippingService {

    async createShipping(ShippingData: IShipping) {
        const Shipping = await ShippingModel.create(ShippingData);
        return Shipping;
    }
    async getShipping() {
        const Shipping = await ShippingModel.find();
        return Shipping;
    }
    async getShippingById(ShippingId: Types.ObjectId | string):Promise<(IShipping &{_id:Types.ObjectId}) | null> {
        const Shipping = await ShippingModel.findById(ShippingId);
        return Shipping;
    }
    async updateShipping(ShippingId: Types.ObjectId | string, ShippingData: IShipping) {
        const Shipping = await ShippingModel.findByIdAndUpdate(ShippingId, {
            $set: ShippingData
        }, { new: true }
        );
        return Shipping;
    }
    async deleteShipping(ShippingId: Types.ObjectId | string) {
        const Shipping = await ShippingModel.findByIdAndDelete(ShippingId);
        return Shipping;
    }
}
export default new ShippingService();
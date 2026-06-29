import IShipping from "../../Model/Shipping/Ishipping";
import ShippingModel from "../../Model/Shipping/ShippingModel";
import { Types } from "mongoose";
import { governorateShippingOrder } from "../../Utils/Governorate/governorateShippingOrder";

const governorateRank = new Map(governorateShippingOrder.map((name, i) => [name, i]));
const rankOf = (category: string) =>
    governorateRank.has(category) ? (governorateRank.get(category) as number) : Number.MAX_SAFE_INTEGER;

class ShippingService {

    async createShipping(ShippingData: Omit<IShipping, "isDeleted">) {
        const Shipping = await ShippingModel.create(ShippingData);
        return Shipping;
    }
    async getShipping() {
        const Shipping = await ShippingModel.find({isDeleted:false}).select("-isDeleted -__v").lean();
        // Sort by governorate importance; unlisted governorates fall to the end.
        return Shipping.sort((a, b) => {
            const diff = rankOf(a.category) - rankOf(b.category);
            return diff !== 0 ? diff : a.category.localeCompare(b.category);
        });
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
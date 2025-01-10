import { IOrder, ProductOrder } from "../../Model/Order/Iorder";
import OrderModel from "../../Model/Order/OrderModel";
import { Types } from "mongoose";
import IProduct from "../../Model/Product/IProduct";
class OrderService {
async createOrder(orderData:Omit<IOrder, "status">){
const newOrder = await OrderModel.create({
      user:orderData.user,
      userInformation:orderData.userInformation,
      shipping: orderData.shipping,
      products: orderData.products,
      price: orderData.price,
    });
    return newOrder;
}
async getOrderById(orderId:Types.ObjectId |string){
    const order = await OrderModel.findById(orderId).populate('products.productId');
    return order;
}
async updateStock(
    orderProducts: ProductOrder[],
    productRecord: Record<string, IProduct>,
    increaseStock: boolean
  ){
    for (const orderProduct of orderProducts) {
      const product = productRecord[orderProduct.productId.toString()];
      if (product && orderProduct.quantity !== undefined) {
        const quantityChange = increaseStock ? orderProduct.quantity : -orderProduct.quantity;
        product.soldItems = (product.soldItems ?? 0) - quantityChange;
        product.availableItems = (product.availableItems ?? 0) + quantityChange;
        try {
            await (product as any).save();
        } catch (error) {
            console.error('Error saving product:', error);
           
        }
      }
    }
  };
}
export default new OrderService;
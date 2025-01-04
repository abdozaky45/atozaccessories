import { IOrder } from "../../Model/Order/Iorder";
import OrderModel from "../../Model/Order/OrderModel";
import { Types } from "mongoose";
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
}
export default new OrderService;
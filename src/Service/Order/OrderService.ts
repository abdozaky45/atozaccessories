import { IOrder, ProductOrder } from "../../Model/Order/Iorder";
import OrderModel from "../../Model/Order/OrderModel";
import { Types } from "mongoose";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
import IProduct from "../../Model/Product/Iproduct";
class OrderService {
  async createOrder(orderData: Omit<IOrder, "status">) {
    const newOrder = await OrderModel.create({
      user: orderData.user,
      userInformation: orderData.userInformation,
      shipping: orderData.shipping,
      products: orderData.products,
      price: orderData.price,
    });
    return newOrder;
  }
  async getOrderById(orderId: Types.ObjectId | string) {
    const order = await OrderModel.findById(orderId).populate('products.productId');
    return order;
  }
  async updateStock(
    orderProducts: ProductOrder[],
    productRecord: Record<string, IProduct>,
    increaseStock: boolean
  ) {
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
  async getUserOrders(userId: Types.ObjectId | string) {
    const orders = await OrderModel.find({ user: userId }).populate([
      { path: SchemaTypesReference.Shipping, select: '-_id category cost' },
      { path: SchemaTypesReference.UserInformation, select: '-_id country address primaryPhone governorate' },
      {
        path: 'products.productId',
        select: '-_id defaultImage', 
      }
    ]).sort({ createdAt: -1 });
    return orders;
  }
  async getAllOrders(page: number, status?: string) {
    let limit = 20;
    page = !page || page < 1 || isNaN(page) ? 1 : page;
    const skip = limit * (page - 1);
    const filter: any = {};
    if (status) {
        filter.status = status;
    }
    
    const totalItems = await OrderModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);
    const orders = await OrderModel.find(filter)
        .populate([
            { path: SchemaTypesReference.Shipping, select: '-_id category cost' },
            { path: SchemaTypesReference.UserInformation, select: '-_id country address primaryPhone governorate' },
            {
              path: 'products.productId',
              select: '-_id defaultImage', 
            }
        ])
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();

    return { totalItems, totalPages, currentPage: page, orders };
}
}

export default new OrderService;
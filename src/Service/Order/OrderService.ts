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
    const order = await OrderModel.findById(orderId).populate([
      { path: "products.productId" },
      { path: SchemaTypesReference.Shipping, select: "category cost" },
      {
        path: SchemaTypesReference.UserInformation,
        select: "country address primaryPhone governorate",
      },
    ]);
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
        const quantityChange = increaseStock
          ? orderProduct.quantity
          : -orderProduct.quantity;
        product.soldItems = (product.soldItems ?? 0) - quantityChange;
        product.availableItems = (product.availableItems ?? 0) + quantityChange;
        try {
          await (product as any).save();
        } catch (error) {
          console.error("Error saving product:", error);
        }
      }
    }
  }
  async getUserOrders(userId: Types.ObjectId | string) {
    const orders = await OrderModel.find({ user: userId })
      .populate([
        { path: SchemaTypesReference.Shipping, select: "-_id category cost" },
        {
          path: SchemaTypesReference.UserInformation,
          select: "-_id country address primaryPhone governorate",
        },
        {
          path: "products.productId",
          select: "defaultImage",
        },
      ])
      .sort({ createdAt: -1 });
    return orders;
  }
  async getAllOrders(page: number, status?: string, orderId?: string) {
    let limit = 20;
    page = !page || page < 1 || isNaN(page) ? 1 : page;
    const skip = limit * (page - 1);
    const filter: any = {};
    if (status) {
      filter.status = status;
    }
    if (orderId) {
      filter.$expr = {
        $regexMatch: {
          input: { $toString: "$_id" },
          regex: orderId + "$",
        },
      };
    }
    const totalItems = await OrderModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);
    const orders = await OrderModel.find(filter)
      .populate([
        { path: SchemaTypesReference.Shipping, select: "-_id category cost" },
        {
          path: SchemaTypesReference.UserInformation,
          select:
            "-_id firstName lastName country address primaryPhone governorate",
        },
        {
          path: "products.productId",
          select: "defaultImage",
        },
      ])
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return { totalItems, totalPages, currentPage: page, orders };
  }
}

export default new OrderService();

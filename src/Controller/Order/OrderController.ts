import { Request, Response, NextFunction } from 'express';
import { ApiError, ApiResponse, asyncHandler } from '../../Utils/ErrorHandling';
import OrderModel from '../../Model/Order/OrderModel';
import ProductModel from '../../Model/Product/ProductModel';
import ShippingModel from '../../Model/Shipping/ShippingModel';

import { sendEmail } from '../../Utils/Nodemailer/SendEmail';
import { generateInvoice } from '../../Utils/Nodemailer/SendInvoice';
import UserModel from '../../Model/User/UserInformation/UserModel';
import { IOrder, ProductOrder } from '../../Model/Order/Iorder';
import IProduct from '../../Model/Product/IProduct';
import { ObjectId } from 'mongoose';
import SchemaTypesReference from '../../Utils/Schemas/SchemaTypesReference';
import ShippingService from '../../Service/Shipping/ShippingService';
import { findUserInformationById } from '../../Service/User/AuthService';
import OrderService from '../../Service/Order/OrderService';
import ErrorMessages from '../../Utils/Error';
import SuccessMessage from '../../Utils/SuccessMessages';
import { orderStatusType } from '../../Utils/OrderStatusType';

class OrderController {
  createOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { products, shippingId, userId } = req.body;
    const shipping = await ShippingService.getShippingById(shippingId);
    if (!shipping) {
      throw new ApiError(404, ErrorMessages.SHIPPING_NOT_FOUND);
    }
    const userInformation = await findUserInformationById(userId);
    if (!userInformation) {
      throw new ApiError(404, ErrorMessages.USER_INFORMATION_NOT_FOUND);
    }
    const productIds = products.map((product: ProductOrder) => product.productId);
    const foundProducts = await ProductModel.find({ _id: { $in: productIds } });
    const productRecord: Record<string, IProduct> = foundProducts.reduce((acc: Record<string, IProduct>, product) => {
      acc[product._id.toString()] = product as IProduct;
      return acc;
    }, {});
    let orderProducts = [];
    let totalPrice = 0;
    let totalQuantity = 0;
    for (const product of products) {
      const foundProduct = productRecord[product.productId];
      if (!foundProduct) {
        throw new ApiError(404, ErrorMessages.PRODUCT_NOT_FOUND);
      }
      const productWithId = foundProduct as IProduct & { _id: ObjectId };
      if (productWithId.availableItems < product.quantity) {
        throw new ApiError(400, `Not enough stock for product: ${productWithId.productName}. Available: ${productWithId.availableItems}, Requested: ${product.quantity}`);
      }
      const itemTotalPrice = productWithId.price * product.quantity;
      orderProducts.push({
        productId: productWithId._id.toString(),
        productName: productWithId.productName,
        quantity: product.quantity,
        itemPrice: productWithId.price,
        totalPrice: itemTotalPrice,
      });
      totalPrice += itemTotalPrice;
      totalQuantity += product.quantity;
    }
    let discount = 0;
    if (totalPrice >= 1500) {
      discount = totalPrice * 0.10;
    }
    let shippingCost = shipping.cost;
    if (totalPrice >= 1500 || totalQuantity >= 3) {
      shippingCost = 0;
    }
    const finalPrice = totalPrice - discount + shippingCost;
    const orderCreate: Omit<IOrder, 'status'> = {
      user: userId,
      userInformation: userInformation._id,
      shipping: shipping._id,
      products: orderProducts,
      price: finalPrice,
    }
    const newOrder = await OrderService.createOrder(
      orderCreate
    )
    const orderData = await newOrder.populate([
      { path: SchemaTypesReference.Shipping, select: '-_id category cost' },
      { path: SchemaTypesReference.UserInformation, select: '-_id country address primaryPhone governorate' },
    ]);
    const invoice = generateInvoice({
      customerName: `${userInformation.firstName} ${userInformation.lastName}`,
      restaurantName: 'atozaccesories',
      items: orderProducts,
      Shipping: shippingCost,
      total: finalPrice,
      subTotal: totalPrice,
      discount,
      orderNumber: newOrder._id.toString(),
      orderDate: new Date().toLocaleString(),
      paymentMethod: 'Cash on Delivery',
    });
    await sendEmail({
      to: req.body.currentUser.userInfo.email,
      subject: 'Your Order Invoice',
      html: invoice,
    });
    return res.json(new ApiResponse(200, { order: orderData }, SuccessMessage.ORDER_CREATED));
  });
  updateOrderStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { orderId, status } = req.body;
const order = await OrderService.getOrderById(orderId);
if (!order)
  throw new ApiError(404, ErrorMessages.ORDER_NOT_FOUND);
const productIds = order.products.map((product: ProductOrder) => product.productId);
const foundProducts = await ProductModel.find({ _id: { $in: productIds } });
const productRecord: Record<string, IProduct> = foundProducts.reduce((acc: Record<string, IProduct>, product) => {
  acc[product._id.toString()] = product as IProduct;
  return acc;
}, {});
if (status === orderStatusType.confirmed) {
  for (const orderProduct of order.products) {
    const product = productRecord[orderProduct.productId.toString()];
    if (product && orderProduct.quantity !== undefined) {
      if (product.soldItems === undefined) product.soldItems = 0;
      if (product.availableItems === undefined) product.availableItems = 0;
  
      product.soldItems += orderProduct.quantity;
      product.availableItems -= orderProduct.quantity;
      await (product as any).save();
    }
  }
}
order.status = status;
await order.save();
return res.json(new ApiResponse(200, { order }, SuccessMessage.ORDER_UPDATED));
  });
}
export default new OrderController();
// const updateOrderStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
//   const { orderId, status } = req.body;
  
//   const order = await OrderService.getOrderById(orderId);
//   if (!order) throw new ApiError(404, ErrorMessages.ORDER_NOT_FOUND);
  
//   if (status === orderStatusType.cancelled) {
//     if ([orderStatusType.shipped, orderStatusType.delivered].includes(order.status)) {
//       return res.status(400).json({ message: 'Cannot cancel an order that is shipped or delivered.' });
//     }
    
//     if (order.status === orderStatusType.confirmed) {
//       // Revert stock changes
//       const productIds = order.products.map((product: ProductOrder) => product.productId);
//       const foundProducts = await ProductModel.find({ _id: { $in: productIds } });
//       const productRecord: Record<string, IProduct> = foundProducts.reduce((acc, product) => {
//         acc[product._id.toString()] = product as IProduct;
//         return acc;
//       }, {});
      
//       for (const orderProduct of order.products) {
//         const product = productRecord[orderProduct.productId.toString()];
//         if (product && orderProduct.quantity !== undefined) {
//           product.soldItems = (product.soldItems ?? 0) - orderProduct.quantity;
//           product.availableItems = (product.availableItems ?? 0) + orderProduct.quantity;
//           await product.save();
//         }
//       }
//     }
//   }
  
//   order.status = status;
//   await order.save();
  
//   return res.status(200).json({ message: 'Order status updated successfully', order });
// });

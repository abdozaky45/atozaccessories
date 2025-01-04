import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../Utils/ErrorHandling';
import OrderModel from '../../Model/Order/OrderModel';
import ProductModel from '../../Model/Product/ProductModel';
import ShippingModel from '../../Model/Shipping/ShippingModel';

import { sendEmail } from '../../Utils/Nodemailer/SendEmail';
import { generateInvoice } from '../../Utils/Nodemailer/SendInvoice';
import UserModel from '../../Model/User/UserInformation/UserModel';
import { ProductOrder } from '../../Model/Order/Iorder';
import IProduct from '../../Model/Product/IProduct';
import { ObjectId } from 'mongoose';
import SchemaTypesReference from '../../Utils/Schemas/SchemaTypesReference';

class OrderController {
  createOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { products, shippingId, userId } = req.body;
    const shipping = await ShippingModel.findById(shippingId);
    if (!shipping) {
      return res.status(404).json({ message: 'Shipping method not found' });
    }

    const userInformation = await UserModel.findById(userId);
    if (!userInformation) {
      return res.status(404).json({ message: 'User information not found' });
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
        return res.status(404).json({ message: `Product not found: ${product.productId}` });
      }
      const productWithId = foundProduct as IProduct & { _id: ObjectId };
      if (productWithId.availableItems < product.quantity) {
        return res.status(400).json({
          message: `Not enough stock for product: ${productWithId.productName}. Available: ${productWithId.availableItems}, Requested: ${product.quantity}`,
        });
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
    const newOrder = await OrderModel.create({
      user: userId,
      userInformation: userInformation._id,
      shipping: shipping._id,
      products: orderProducts,
      price: finalPrice,
    });
    const orderData = await newOrder.populate([
      { path: SchemaTypesReference.Shipping , select: '-_id category cost' }, 
      { path: SchemaTypesReference.UserInformation , select: '-_id country address primaryPhone governorate' }, 
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
    return res.status(201).json({
      message: "Thank you for your order. We'll send you a confirmation email shortly.",
      order: orderData,
    });
  });


}
export default new OrderController();

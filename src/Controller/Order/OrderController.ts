import { Request, Response, NextFunction } from 'express';
import { ApiError, ApiResponse, asyncHandler } from '../../Utils/ErrorHandling';
import { sendEmail } from '../../Utils/Nodemailer/SendEmail';
import { generateInvoice } from '../../Utils/Nodemailer/SendInvoice';
import { IOrder, ProductOrder } from '../../Model/Order/Iorder';
import SchemaTypesReference from '../../Utils/Schemas/SchemaTypesReference';
import { findUserInformationById } from '../../Service/User/AuthService';
import OrderService from '../../Service/Order/OrderService';
import ErrorMessages from '../../Utils/Error';
import SuccessMessage from '../../Utils/SuccessMessages';
import { orderStatusType } from '../../Utils/OrderStatusType';
import { retrieveProducts, updateStock } from '../../Service/Product/ProductService';
import { UserTypeEnum } from '../../Utils/UserType';
import IProduct from '../../Model/Product/Iproduct';
import { Types } from 'mongoose';

class OrderController {
  createOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { products, userId } = req.body;
    const { _id } = req.body.currentUser.userInfo;
    const userInformation = await findUserInformationById(userId);
    if (!userInformation) {
      throw new ApiError(404, ErrorMessages.USER_INFORMATION_NOT_FOUND);
    }
    const productIds = products.map((product: ProductOrder) => product.productId);
    const foundProducts = await retrieveProducts(productIds);

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
      const productWithId = foundProduct as IProduct & { _id: Types.ObjectId };
      if (productWithId.availableItems < product.quantity) {
        throw new ApiError(400, `Not enough stock for product: ${productWithId.productName}. Available: ${productWithId.availableItems}, Requested: ${product.quantity}`);
      }
      const itemTotalPrice = (productWithId.salePrice && productWithId.salePrice > 0 ? productWithId.salePrice : productWithId.price) * product.quantity;
      orderProducts.push({
        productId: productWithId._id.toString(),
        productName: productWithId.productName,
        quantity: product.quantity,
        itemPrice: (productWithId.salePrice && productWithId.salePrice > 0 ? productWithId.salePrice : productWithId.price),
        totalPrice: itemTotalPrice,
      });
      totalPrice += itemTotalPrice;
      totalQuantity += product.quantity;
    }
    let discount = 0;
    if (totalPrice >= 1500) {
      discount = totalPrice * 0.10;
    }
    let shippingCost = userInformation.shipping.cost;
    if (totalPrice >= 1500 || totalQuantity >= 3) {
      shippingCost = 0;
    }
    const finalPrice = totalPrice - discount + shippingCost;
    const orderCreate: Omit<IOrder, 'status'> = {
      user: _id,
      userInformation: userInformation._id,
      shipping: userInformation.shipping._id,
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
    const adminEmails = [process.env.ADMIN_ONE as string, process.env.ADMIN_TWO as string];
    await sendEmail({
      to: req.body.currentUser.userInfo.email,
      subject: 'Your Order Invoice',
      html: invoice,
    });
    await sendEmail({
      to: adminEmails,
      subject: "🚀 New Order Placed - Action Required!",
      html: invoice,
    });
    await updateStock(orderProducts, productRecord, false);
    return res.json(new ApiResponse(200, { order: orderData }, SuccessMessage.ORDER_CREATED));
  });
  updateOrderStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { orderId, status } = req.body;
    const userRole = req.body.currentUser.userInfo.role;
    const order = await OrderService.getOrderById(orderId);
    if (!order) throw new ApiError(404, ErrorMessages.ORDER_NOT_FOUND);

    const productIds = order.products.map((product: ProductOrder) => product.productId);
    const foundProducts = await retrieveProducts(productIds);
    const productRecord: Record<string, IProduct> = foundProducts.reduce((acc: Record<string, IProduct>, product) => {
      acc[product._id.toString()] = product;
      return acc;
    }, {} as Record<string, IProduct>);
    if (status === orderStatusType.confirmed) {
      if (userRole !== UserTypeEnum.ADMIN) {
        throw new ApiError(403, ErrorMessages.NOT_PERMITTED);
      }
      order.status = orderStatusType.confirmed;
      await order.save();
    }
    else if (status === orderStatusType.cancelled) {
      if (userRole !== UserTypeEnum.USER) {
        throw new ApiError(403, ErrorMessages.NOT_PERMITTED);
      }
      if ([orderStatusType.shipped, orderStatusType.delivered, orderStatusType.ordered].includes(order.status as orderStatusType)) {
        throw new ApiError(400, ErrorMessages.NOT_CANCELLED);
      }

      if (order.status === orderStatusType.confirmed) {
        await updateStock(order.products, productRecord, true);
      }
    }
    else if ([orderStatusType.shipped, orderStatusType.delivered, orderStatusType.ordered, orderStatusType.deleted].includes(status)) {
      if (userRole !== UserTypeEnum.ADMIN) {
        throw new ApiError(403, ErrorMessages.NOT_PERMITTED);
      }
    }
    if (status === orderStatusType.deleted) {
      await updateStock(order.products, productRecord, true);
    }
    order.status = status;
    await order.save();

    return res.json(new ApiResponse(200, { order }, SuccessMessage.ORDER_UPDATED));
  });
  getUserOrders = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { _id } = req.body.currentUser.userInfo;
    const orders = await OrderService.getUserOrders(_id);
    return res.json(new ApiResponse(200, { orders }, SuccessMessage.ORDER_FETCHED));
  });
  getAllOrders = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string);
    const { status } = req.query;
    const { role } = req.body.currentUser.userInfo;
    if (role !== UserTypeEnum.ADMIN) {
      throw new ApiError(403, ErrorMessages.NOT_PERMITTED);
    }
    const orders = await OrderService.getAllOrders(page, status as string);
    return res.json(new ApiResponse(200, orders, SuccessMessage.ORDER_FETCHED));
  });
  getOrderById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { orderId } = req.params;
    const order = await OrderService.getOrderById(orderId);
    if (!order) throw new ApiError(404, ErrorMessages.ORDER_NOT_FOUND);
    return res.json(new ApiResponse(200, { order }, SuccessMessage.ORDER_FETCHED));
  });
}
export default new OrderController();

import { Request, Response, NextFunction } from 'express';
import { ApiError, ApiResponse, asyncHandler } from '../../Utils/ErrorHandling';
import { sendEmail } from '../../Utils/Nodemailer/SendEmail';
import { generateInvoice } from '../../Utils/Nodemailer/SendInvoice';
import OrderService from '../../Service/Order/OrderService';
import ErrorMessages from '../../Utils/Error';
import SuccessMessage from '../../Utils/SuccessMessages';
import { orderStatusType } from '../../Utils/OrderStatusType';
import { UserTypeEnum } from '../../Utils/UserType';
import moment from '../../Utils/DateAndTime';

const adminEmails = () => [process.env.ADMIN_ONE as string, process.env.ADMIN_TWO as string];

const buildInvoice = (order: any) =>
  generateInvoice({
    customerName: `${order.userInformation.firstName} ${order.userInformation.lastName}`,
    restaurantName: 'atozaccesories',
    items: order.products.map((p: any) => ({
      productId: p.productId?.toString(),
      productName: p.productName,
      quantity: p.quantity,
      itemPrice: p.itemPrice,
      totalPrice: p.totalPrice,
    })),
    Shipping: order.shippingCost,
    total: order.totalAmount,
    subTotal: order.subTotal,
    discount: order.discount,
    orderNumber: order._id.toString().slice(-8),
    orderDate: `#${moment().tz('Africa/Cairo').format('YYYY-MM-DD HH:mm:ss')}`,
    paymentMethod: 'Cash on Delivery',
  });

class OrderController {
  // ── USER ─────────────────────────────────────────────────────────────────────

  createOrderController = asyncHandler(async (req: Request, res: Response) => {
    const { products, userId, freeGiftVariantId } = req.body;
    const { _id, email } = req.body.currentUser.userInfo;

    const order = await OrderService.createOrder({
      authUserId: _id,
      userInformationId: userId,
      products,
      freeGiftVariantId,
    });

    const invoice = buildInvoice(order);
    sendEmail({ to: email, subject: 'Your Order Invoice', html: invoice }).catch(console.error);
    sendEmail({ to: adminEmails(), subject: '🚀 New Order Placed - Action Required!', html: invoice }).catch(console.error);

    return res.json(new ApiResponse(200, { order }, SuccessMessage.ORDER_CREATED));
  });

  previewOrderController = asyncHandler(async (req: Request, res: Response) => {
    const { items, userInformationId, freeGiftVariantId } = req.body;

    const preview = await OrderService.previewOrder({ items, userInformationId, freeGiftVariantId });
    return res.json(new ApiResponse(200, preview));
  });

  cancelOrderController = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { _id } = req.body.currentUser.userInfo;

    const order = await OrderService.cancelOrder(orderId, _id);

    sendEmail({
      to: adminEmails(),
      subject: `❌ Order #${order._id.toString().slice(-8)} Cancelled by Customer`,
      html: buildInvoice(order),
    }).catch(console.error);

    return res.json(new ApiResponse(200, { order }, SuccessMessage.ORDER_UPDATED));
  });

  getOrderByIdController = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const order = await OrderService.getOrderById(orderId);
    if (!order) throw new ApiError(404, ErrorMessages.ORDER_NOT_FOUND);
    return res.json(new ApiResponse(200, { order }, SuccessMessage.ORDER_FETCHED));
  });

  getUserOrdersController = asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const { _id, role } = req.body.currentUser.userInfo;

    if (role !== UserTypeEnum.ADMIN && customerId !== _id) {
      throw new ApiError(403, ErrorMessages.NOT_PERMITTED);
    }

    const orders = await OrderService.getUserOrders(customerId);
    return res.json(new ApiResponse(200, { orders }, SuccessMessage.ORDER_FETCHED));
  });

  // ── ADMIN ─────────────────────────────────────────────────────────────────────

  getAllOrdersController = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string);
    const { status, orderId } = req.query;

    const result = await OrderService.getAllOrders(page, status as string, orderId as string);
    return res.json(new ApiResponse(200, result, SuccessMessage.ORDER_FETCHED));
  });

  updateOrderStatusController = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { status } = req.body;

    let order: any;
    if (status === orderStatusType.cancelled) {
      order = await OrderService.adminCancelOrder(orderId);
      sendEmail({
        to: adminEmails(),
        subject: `❌ Order #${order._id.toString().slice(-8)} Cancelled by Admin`,
        html: buildInvoice(order),
      }).catch(console.error);
    } else if (status === orderStatusType.deleted) {
      order = await OrderService.adminDeleteOrder(orderId);
    } else {
      order = await OrderService.updateOrderStatus(orderId, status);
    }

    return res.json(new ApiResponse(200, { order }, SuccessMessage.ORDER_UPDATED));
  });
}

export default new OrderController();

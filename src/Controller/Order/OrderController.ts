import { Request, Response, NextFunction } from 'express';
import { ApiError, ApiResponse, asyncHandler } from '../../Utils/ErrorHandling';
import { sendEmail } from '../../Utils/Nodemailer/SendEmail';
import { generateInvoice } from '../../Utils/Nodemailer/SendInvoice';
import { generateOrderStatusEmail } from '../../Utils/Nodemailer/OrderStatusEmail';
import OrderService from '../../Service/Order/OrderService';
import AuthModel from '../../Model/User/auth/AuthModel';
import ErrorMessages from '../../Utils/Error';
import SuccessMessage from '../../Utils/SuccessMessages';
import { orderStatusType } from '../../Utils/OrderStatusType';
import { UserTypeEnum } from '../../Utils/UserType';
import moment from '../../Utils/DateAndTime';

const BRAND = 'A to Z Accessory';

// Recipients = every user whose role is admin (from the DB, not env vars).
const getAdminEmails = async (): Promise<string[]> => {
  const admins = await AuthModel.find({ role: UserTypeEnum.ADMIN }).select('email').lean();
  return admins.map((a: any) => a.email).filter(Boolean);
};

// The order stores only `user` (auth id); look up the customer's email from it.
const getCustomerEmail = async (userId: any): Promise<string | null> => {
  const user = await AuthModel.findById(userId).select('email').lean();
  return (user as any)?.email ?? null;
};

const nowCairo = () => moment().tz('Africa/Cairo').format('YYYY-MM-DD HH:mm');

// Customer-facing milestone copy. Same template, only the key/text/colour change.
const CUSTOMER_STATUS_EMAIL: Record<string, { headline: string; message: string; badge: string; accent: string }> = {
  [orderStatusType.confirmed]: {
    headline: 'تم تأكيد طلبك',
    message: 'تم تأكيد طلبك وجارٍ تجهيزه للشحن. هنبلّغك بأي تحديث.',
    badge: 'تم التأكيد',
    accent: '#1E7F4F',
  },
  [orderStatusType.shipped]: {
    headline: 'تم شحن طلبك',
    message: 'طلبك في الطريق إليك الآن. ترقّب وصوله قريباً.',
    badge: 'تم الشحن',
    accent: '#BD8958',
  },
  [orderStatusType.delivered]: {
    headline: 'تم توصيل طلبك',
    message: 'نتمنى أن ينال طلبك إعجابك. شكراً لتسوقك معنا.',
    badge: 'تم التوصيل',
    accent: '#1E7F4F',
  },
  [orderStatusType.cancelled]: {
    headline: 'تم إلغاء طلبك',
    message: 'تم إلغاء طلبك. لو ده مكنش مقصود أو محتاج مساعدة، تواصل معنا.',
    badge: 'ملغي',
    accent: '#C0392B',
  },
};

const buildStatusEmail = (
  order: any,
  cfg: { headline: string; message: string; badge: string; accent: string },
  recipientName?: string
) =>
  generateOrderStatusEmail({
    brandName: BRAND,
    recipientName: recipientName ?? `${order.userInformation.firstName} ${order.userInformation.lastName}`,
    orderNumber: order._id.toString().slice(-8),
    headline: cfg.headline,
    message: cfg.message,
    badge: cfg.badge,
    accent: cfg.accent,
    total: order.totalAmount,
    orderDate: nowCairo(),
  });

const buildInvoice = (order: any) =>
  generateInvoice({
    customerName: `${order.userInformation.firstName} ${order.userInformation.lastName}`,
    brandName: 'A to Z Accessory',
    items: order.products.map((p: any) => ({
      productName: p.productName,
      quantity: p.quantity,
      itemPrice: p.itemPrice,
      totalPrice: p.totalPrice,
      size: p.size,
      color: p.color,
    })),
    subTotal: order.subTotal,
    discount: order.discount,
    shippingCost: order.shippingCost,
    freeShipping: order.freeShipping,
    total: order.totalAmount,
    orderNumber: order._id.toString().slice(-8),
    orderDate: moment().tz('Africa/Cairo').format('YYYY-MM-DD HH:mm'),
    paymentMethod: 'Cash on Delivery',
  });

class OrderController {
  // ── USER ─────────────────────────────────────────────────────────────────────

  createOrderController = asyncHandler(async (req: Request, res: Response) => {
    const { products, userId } = req.body;
    const { _id, email } = req.body.currentUser.userInfo;

    const order = await OrderService.createOrder({
      authUserId: _id,
      userInformationId: userId,
      products,
    });

    const invoice = buildInvoice(order);
    sendEmail({ to: email, subject: `تأكيد طلبك - ${BRAND}`, html: invoice }).catch(console.error);
    getAdminEmails()
      .then((admins) => {
        if (admins.length) {
          sendEmail({ to: admins, subject: '🚀 طلب جديد - مطلوب إجراء', html: invoice }).catch(console.error);
        }
      })
      .catch(console.error);

    return res.json(new ApiResponse(200, { order }, SuccessMessage.ORDER_CREATED));
  });

  previewOrderController = asyncHandler(async (req: Request, res: Response) => {
    const { items, userInformationId } = req.body;

    const preview = await OrderService.previewOrder({ items, userInformationId });
    return res.json(new ApiResponse(200, preview));
  });

  cancelOrderController = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { _id, email } = req.body.currentUser.userInfo;

    const order = await OrderService.cancelOrder(orderId, _id);
    const orderNo = order._id.toString().slice(-8);
    const customerName = `${order.userInformation.firstName} ${order.userInformation.lastName}`;

    // Customer: confirmation that their cancellation went through.
    sendEmail({
      to: email,
      subject: 'تم إلغاء طلبك',
      html: buildStatusEmail(order, CUSTOMER_STATUS_EMAIL[orderStatusType.cancelled], customerName),
    }).catch(console.error);

    // Admins: alert that the customer cancelled.
    getAdminEmails()
      .then((admins) => {
        if (admins.length) {
          sendEmail({
            to: admins,
            subject: `❌ العميل ألغى الطلب #${orderNo}`,
            html: buildStatusEmail(
              order,
              {
                headline: 'ألغى العميل الطلب',
                message: `قام العميل ${customerName} بإلغاء الطلب #${orderNo}. تم إرجاع المخزون تلقائياً.`,
                badge: 'إلغاء من العميل',
                accent: '#C0392B',
              },
              ''
            ),
          }).catch(console.error);
        }
      })
      .catch(console.error);

    return res.json(new ApiResponse(200, { order }, SuccessMessage.ORDER_UPDATED));
  });

  getOrderByIdController = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const order = await OrderService.getOrderById(orderId);
    if (!order) throw new ApiError(404, ErrorMessages.ORDER_NOT_FOUND);
    return res.json(new ApiResponse(200, { order }, SuccessMessage.ORDER_FETCHED));
  });

  getUserOrdersController = asyncHandler(async (req: Request, res: Response) => {
    const { _id, role } = req.body.currentUser.userInfo;
    // `/order/get-user-orders` derives the customer from the auth token; the
    // admin `/customer/:customerId` route passes an explicit id.
    const customerId = req.params.customerId ?? _id;

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
    } else if (status === orderStatusType.deleted) {
      order = await OrderService.adminDeleteOrder(orderId);
    } else {
      order = await OrderService.updateOrderStatus(orderId, status);
    }

    // Notify the customer of milestone status changes (confirmed / shipped / delivered / cancelled).
    const cfg = CUSTOMER_STATUS_EMAIL[status];
    if (cfg) {
      getCustomerEmail(order.user)
        .then((customerEmail) => {
          if (customerEmail) {
            sendEmail({ to: customerEmail, subject: cfg.headline, html: buildStatusEmail(order, cfg) }).catch(console.error);
          }
        })
        .catch(console.error);
    }

    return res.json(new ApiResponse(200, { order }, SuccessMessage.ORDER_UPDATED));
  });
}

export default new OrderController();

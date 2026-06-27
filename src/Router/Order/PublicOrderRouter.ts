import { Router } from 'express';
import OrderController from '../../Controller/Order/OrderController';
import * as orderValidation from '../../Validation/Order/OrderValidation';
import { Validation } from '../../middleware/ValidationMiddleware';

const PublicOrderRouter = Router();

PublicOrderRouter.post(
  '/',
  Validation(orderValidation.createOrderValidation),
  OrderController.createOrderController
);

PublicOrderRouter.post(
  '/preview',
  Validation(orderValidation.previewOrderValidation),
  OrderController.previewOrderController
);

// Token-derived: the signed-in customer's own orders (mirrors
// /wishlist/get-user-wishlist). MUST precede the `/:orderId` route below, or
// Express captures the literal "get-user-orders" as an order id → CastError.
PublicOrderRouter.get(
  '/get-user-orders',
  OrderController.getUserOrdersController
);

PublicOrderRouter.get(
  '/customer/:customerId',
  Validation(orderValidation.getUserOrdersValidation),
  OrderController.getUserOrdersController
);

PublicOrderRouter.get(
  '/:orderId',
  Validation(orderValidation.userOrderIdValidation),
  OrderController.getOrderByIdController
);

PublicOrderRouter.patch(
  '/cancel/:orderId',
  Validation(orderValidation.userOrderIdValidation),
  OrderController.cancelOrderController
);

export default PublicOrderRouter;

import { Router } from 'express';
import OrderController from '../../Controller/Order/OrderController';
import * as orderValidation from '../../Validation/Order/OrderValidation';
import { Validation } from '../../middleware/ValidationMiddleware';

const OrderRouter = Router();

// Mounted at /admin/orders — full paths:
// GET  /admin/orders/all
// GET  /admin/orders/:orderId
// PATCH /admin/orders/status/:orderId

OrderRouter.get(
  '/all',
  Validation(orderValidation.getAllOrdersValidation),
  OrderController.getAllOrdersController
);

OrderRouter.get(
  '/:orderId',
  Validation(orderValidation.AdminOrderIdValidation),
  OrderController.getOrderByIdController
);

OrderRouter.patch(
  '/status/:orderId',
  Validation(orderValidation.updateOrderStatusValidation),
  OrderController.updateOrderStatusController
);

export default OrderRouter;

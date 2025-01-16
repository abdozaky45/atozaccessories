import { Router } from 'express';
import OrderController from '../../Controller/Order/OrderController';
import * as orderValidation from '../../Validation/Order/OrderValidation';
import { Validation } from '../../middleware/ValidationMiddleware';
import { baseSchema } from '../../Validation/BaseSchema';

const OrderRouter = Router();
OrderRouter.post("/create", Validation(orderValidation.createOrderValidation), OrderController.createOrder);
OrderRouter.patch("/update-status", Validation(orderValidation.updateOrderStatusValidation), OrderController.updateOrderStatus);
OrderRouter.get("/get-user-orders", Validation(baseSchema), OrderController.getUserOrders);
OrderRouter.get("/get-all-orders", Validation(orderValidation.getAllOrdersValidation), OrderController.getAllOrders);
export default OrderRouter;
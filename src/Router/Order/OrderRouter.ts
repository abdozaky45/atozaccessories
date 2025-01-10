import { Router } from 'express';
import OrderController from '../../Controller/Order/OrderController';
const OrderRouter = Router();
OrderRouter.post("/create", OrderController.createOrder);
OrderRouter.patch("/update-status", OrderController.updateOrderStatus);
export default OrderRouter;
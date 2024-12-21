import { Router } from 'express';
import * as ShippingController from '../../Controller/Shipping/ShippingController';
import { Validation } from '../../middleware/ValidationMiddleware';
import * as shippingValidation from '../../Validation/Shipping/ShippingValidation';


const shippingRouter = Router();

shippingRouter.post('/', Validation(shippingValidation.createShipping), ShippingController.createShipping);
shippingRouter.get('/', ShippingController.getShipping);
shippingRouter.get('/:id', Validation(shippingValidation.validateShippingById), ShippingController.getShippingById);
shippingRouter.patch('/:id', Validation(shippingValidation.updateShipping), ShippingController.updateShipping);
shippingRouter.delete('/:id', Validation(shippingValidation.validateShippingById), ShippingController.deleteShipping);

export default shippingRouter;
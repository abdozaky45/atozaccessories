import { Router } from 'express';
import * as ShippingController from '../../Controller/Shipping/ShippingController';

// Public read-only access to shipping costs (governorate prices). These are shared
// reference data the storefront needs without any auth. Mutations stay admin-only
// on the protected ShippingRouter.
const ShippingPublicRouter = Router();

ShippingPublicRouter.get('/', ShippingController.getShipping);
ShippingPublicRouter.get('/:id', ShippingController.getShippingById);

export default ShippingPublicRouter;

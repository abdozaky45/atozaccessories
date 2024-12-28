import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../Utils/ErrorHandling';
import ProductModel from '../../Model/Product/ProductModel';
class OrderController {
    createOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const {products , shipping } = req.body;
        let orderProducts = [];
        let orderPrice = 0;
if (products.length === 1) {
    const singleProduct = products[0];
    const checkProduct = await ProductModel.findById(singleProduct.productId);
    if (!checkProduct) {
        return res.status(404).json({ message: 'Product not found' });
    }
    

}

    });
}
export default new OrderController();

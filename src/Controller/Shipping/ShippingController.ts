import { Request, Response, NextFunction } from 'express'
import { ApiError, ApiResponse, asyncHandler } from '../../Utils/ErrorHandling'
import ShippingService from '../../Service/Shipping/ShippingService';
import SuccessMessage from '../../Utils/SuccessMessages';
import ErrorMessages from '../../Utils/Error';
import IShipping from '../../Model/Shipping/Ishipping';
export const createShipping = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const shippingData: Omit<IShipping,"isDeleted"> = {
            category: req.body.category,
            cost: req.body.cost
        }
        const shipping = await ShippingService.createShipping(shippingData);
        return res.status(201).json(new ApiResponse(201, { shipping }, SuccessMessage.SHIPPING_CREATED,
        ));
    }
);
export const getShipping = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const shipping = await ShippingService.getShipping();
        return res.status(200).json(new ApiResponse(200, { shipping }));
    }
);
export const getShippingById = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const shippingId = req.params.id;
        const shipping = await ShippingService.getShippingById(shippingId);
        if (!shipping) {
            throw new ApiError(404, ErrorMessages.SHIPPING_NOT_FOUND);
        }
        return res.status(200).json(new ApiResponse(200, { shipping }));
    }
);
export const updateShipping = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const shippingData:  Omit<IShipping,"isDeleted"> = {
            category: req.body.category,
            cost: req.body.cost
        }
        const shippingId = req.params.id;
        const checkShipping = await ShippingService.getShippingById(shippingId);
        if (!checkShipping) {
            throw new ApiError(404, ErrorMessages.SHIPPING_NOT_FOUND);
        }
        const shipping = await ShippingService.updateShipping(shippingId, shippingData);
        return res.status(200).json(new ApiResponse(200, { shipping }, SuccessMessage.SHIPPING_UPDATED));
    }
);
export const deleteShipping = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const shippingId = req.params.id;
        const checkShipping = await ShippingService.getShippingById(shippingId);
        if (!checkShipping) {
            throw new ApiError(404, ErrorMessages.SHIPPING_NOT_FOUND);
        }
        const shipping = await ShippingService.deleteShipping(shippingId);
        return res.status(200).json(new ApiResponse(200, {} , SuccessMessage.SHIPPING_DELETED));
    }
);
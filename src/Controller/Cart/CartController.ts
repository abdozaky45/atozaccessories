import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../Utils/ErrorHandling";
import CartInterfaceModel from "../../Model/Cart/CartInterfaceModel";
import mongoose from "mongoose";
export const createCartGust = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const ObjectId = new mongoose.Types.ObjectId();
    const cartData: CartInterfaceModel = {
      user: ObjectId,
      items: req.body.items,
      Subtotal: req.body.Subtotal,
      Total: req.body.Total,
      createdAt: req.body.createdAt,
      updatedAt: req.body.updatedAt,
    };
  }
);
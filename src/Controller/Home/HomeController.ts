import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import {
  getBestSellers,
  getFlashSale,
  getOnSale,
  getNewArrivals,
} from "../../Service/Home/HomeService";

export const getHome = asyncHandler(async (_req: Request, res: Response) => {
  const [bestSellers, onSale, flashSale, newArrivals] = await Promise.all([
    getBestSellers(),
    getOnSale(),
    getFlashSale(),
    getNewArrivals(),
  ]);

  return res.json(
    new ApiResponse(200, { bestSellers, onSale, flashSale, newArrivals }, "")
  );
});

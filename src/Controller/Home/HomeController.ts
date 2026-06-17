import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import { getBestSellers, getDealOfDay, getFlashSale, getOnSale } from "../../Service/Home/HomeService";

export const getHome = asyncHandler(async (_req: Request, res: Response) => {
  const [bestSellers, onSale, dealOfDay, flashSale] = await Promise.all([
    getBestSellers(),
    getOnSale(),
    getDealOfDay(),
    getFlashSale(),
  ]);

  return res.json(new ApiResponse(200, { bestSellers, onSale, dealOfDay, flashSale }, ""));
});

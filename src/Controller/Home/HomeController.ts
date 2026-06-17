import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import { getBestSellers, getFlashSale, getOnSale } from "../../Service/Home/HomeService";

export const getHome = asyncHandler(async (_req: Request, res: Response) => {
  const [bestSellers, onSale, flashSale] = await Promise.all([
    getBestSellers(),
    getOnSale(),
    getFlashSale(),
  ]);

  return res.json(new ApiResponse(200, { bestSellers, onSale, flashSale }, ""));
});

import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import {
  getBestSellers,
  getFlashSale,
  getOnSale,
  getNewArrivals,
} from "../../Service/Home/HomeService";
import { getOrSet } from "../../Utils/Cache";
import { CacheKeys, CacheTTL } from "../../Utils/Cache/keys";

export const getHome = asyncHandler(async (_req: Request, res: Response) => {
  const payload = await getOrSet(CacheKeys.home, CacheTTL.home, async () => {
    const [bestSellers, onSale, flashSale, newArrivals] = await Promise.all([
      getBestSellers(),
      getOnSale(),
      getFlashSale(),
      getNewArrivals(),
    ]);
    return { bestSellers, onSale, flashSale, newArrivals };
  });

  return res.json(new ApiResponse(200, payload, ""));
});

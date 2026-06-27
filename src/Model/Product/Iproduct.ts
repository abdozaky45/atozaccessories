import { Types } from "mongoose";
interface ProductDefaultImage {
    mediaUrl: string;
    mediaId: string;
}
interface ProductAlbumImages {
    mediaUrl: string;
    mediaId: string;
}
export default interface IProduct {
  productName: string;
  productDescription: string;
  price: number;
  availableItems: number;
  salePrice?: number;
  discount?: number;
  discountPercentage?: number;
  soldItems?: number;
  isSoldOut?: boolean;
  isSale?: boolean;
  isBestSeller?: boolean;
  bestSellerManual?: boolean;
  wholesalePrice?: number;
  finalPrice?: number;
  category: Types.ObjectId | string;
  createdBy: Types.ObjectId | string;
  slug: string;
  defaultImage: ProductDefaultImage;
  albumImages?: ProductAlbumImages[];
  createdAt: number;
  isDeleted?: boolean;
  paginate?: (page: number) => Promise<any>;
}

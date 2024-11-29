import { Types } from "mongoose";
interface ProductDefaultImage {
  defaultImage: {
    mediaUrl: string;
    mediaId: string;
  };
}
interface ProductAlbumImages {
  alumImages: {
    mediaUrl: string;
    mediaId: string;
  };
}
export default interface ProductInterFaceModel {
  productName: string;
  productDescription: string;
  price: number;
  salePrice: number;
  expiredSale: number;
  isExpiredSale: boolean;
  discount: number;
  availableItems: number;  
  soldItems:number;
  category: Types.ObjectId;
  createdBy: Types.ObjectId;
  slug: string;
  defaultImage: ProductDefaultImage;
  albumImages: ProductAlbumImages[];
  createdAt: number;
  updatedAt: number;
}

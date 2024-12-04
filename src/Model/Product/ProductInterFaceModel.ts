import { Types } from "mongoose";
interface ProductDefaultImage {
    mediaUrl: string;
    mediaId: string;
}
interface ProductAlbumImages {
    mediaUrl: string;
    mediaId: string;
}
export default interface ProductInterFaceModel {
  productName: string;
  productDescription: string;
  price: number;
  availableItems: number;  
  salePrice?: number;
  discount?:number;
  discountPercentage?: number;
  soldItems?:number;
  isSoldOut?: boolean;
  expiredSale?: number;
  isExpiredSale?: boolean;
  isSale?: boolean;
  category: Types.ObjectId | string;
  createdBy: Types.ObjectId | string;
  slug: string;
  defaultImage: ProductDefaultImage;
  albumImages?: ProductAlbumImages[];
  createdAt: number;
  updatedAt: number;
  paginate?: (page: number) => Promise<any>;
}
   /*
*productName
*productDescription
*price
*availableItems
*Category
*defaultImage
salePrice
expiredSale
albumImages
 */
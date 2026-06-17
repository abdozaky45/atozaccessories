import ProductModel from "../../Model/Product/ProductModel";
import CategoryModel from "../../Model/Categories/CategoryModel";
import OfferModel from "../../Model/Offers/OfferModel";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";

const PRODUCT_SELECT =
  "productName slug finalPrice price salePrice discount discountPercentage isSale isBestSeller defaultImage category";

const CATEGORY_POPULATE = { path: SchemaTypesReference.Category, select: "categoryName" };

async function fetchDiverseProducts(
  baseFilter: Record<string, any>,
  categoryIds: any[],
  sortField: string
): Promise<any[]> {
  const perCat = await Promise.all(
    categoryIds.map((catId) =>
      ProductModel.find({ ...baseFilter, category: catId })
        .select(PRODUCT_SELECT)
        .sort({ [sortField]: -1 })
        .limit(2)
        .populate(CATEGORY_POPULATE)
        .lean()
    )
  );

  const initial = perCat.flat().slice(0, 20);
  if (initial.length >= 20) return initial;

  const excludeIds = initial.map((p: any) => p._id);
  const filler = await ProductModel.find({
    ...baseFilter,
    category: { $in: categoryIds },
    _id: { $nin: excludeIds },
  })
    .select(PRODUCT_SELECT)
    .sort({ [sortField]: -1 })
    .limit(20 - initial.length)
    .populate(CATEGORY_POPULATE)
    .lean();

  return [...initial, ...filler];
}

function buildOfferShape(offer: any) {
  return {
    title: offer.title,
    description: offer.description,
    discountPercentage: offer.reward.discountPercentage,
    endDate: offer.timing.endDate,
  };
}

export const getBestSellers = async (): Promise<any[]> => {
  const categories = await CategoryModel.find({ isDeleted: false }, { _id: 1 }).lean();
  if (!categories.length) return [];

  return fetchDiverseProducts(
    { isBestSeller: true, isDeleted: false },
    categories.map((c) => c._id),
    "soldItems"
  );
};

export const getOnSale = async (): Promise<any[]> => {
  const categories = await CategoryModel.find({ isDeleted: false }, { _id: 1 }).lean();
  if (!categories.length) return [];

  return fetchDiverseProducts(
    { isSale: true, isDeleted: false },
    categories.map((c) => c._id),
    "discountPercentage"
  );
};

export const getDealOfDay = async (): Promise<any | null> => {
  const offer = await OfferModel.findOne({
    offerType: "deal_of_day",
    status: "active",
    isActive: true,
  }).lean();

  if (!offer) return null;

  const products = await ProductModel.find({
    _id: { $in: offer.targetProducts },
    isDeleted: false,
  })
    .select(PRODUCT_SELECT)
    .populate(CATEGORY_POPULATE)
    .lean();

  if (!products.length) return null;

  return { ...buildOfferShape(offer), products };
};

export const getFlashSale = async (): Promise<any | null> => {
  const offer = await OfferModel.findOne({
    offerType: "flash_sale",
    status: "active",
    isActive: true,
  }).lean();

  if (!offer) return null;

  let categoryIds: any[];

  if (offer.targetCategories?.length) {
    const activeCats = await CategoryModel.find(
      { _id: { $in: offer.targetCategories }, isDeleted: false },
      { _id: 1 }
    ).lean();
    categoryIds = activeCats.map((c) => c._id);
  } else {
    const allActiveCats = await CategoryModel.find({ isDeleted: false }, { _id: 1 }).lean();
    categoryIds = allActiveCats.map((c) => c._id);
  }

  if (!categoryIds.length) return { ...buildOfferShape(offer), products: [] };

  const products = await fetchDiverseProducts(
    { isDeleted: false },
    categoryIds,
    "soldItems"
  );

  return { ...buildOfferShape(offer), products };
};

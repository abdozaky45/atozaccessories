import SizeModel from "../../Model/Sizes/SizeModel";

export const createSize = async ({ number, order }: { number: string; order: number }) => {
  return SizeModel.create({ number, order });
};

export const findSizeById = async (_id: string) => {
  return SizeModel.findById(_id);
};

export const findSizeByNumber = async (number: string) => {
  return SizeModel.findOne({ number });
};

export const getAllSizes = async (page: number = 1) => {
  const limit = 20;
  page = !page || page < 1 || isNaN(page) ? 1 : page;
  const skip = limit * (page - 1);
  const totalItems = await SizeModel.countDocuments();
  const totalPages = Math.ceil(totalItems / limit);
  const data = await SizeModel.find().sort({ order: 1 }).skip(skip).limit(limit).select("-__v");
  return { data, totalItems, totalPages, currentPage: page };
};

export const prepareSizeUpdates = (size: any, number?: string, order?: number) => {
  let updated = false;
  if (number !== undefined && number !== size.number) {
    size.number = number;
    updated = true;
  }
  if (order !== undefined && order !== size.order) {
    size.order = order;
    updated = true;
  }
  return updated ? size : null;
};

export const deleteSizeById = async (_id: string) => {
  return SizeModel.findByIdAndDelete(_id);
};

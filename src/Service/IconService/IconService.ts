import IconModel from "../../Model/Icons/IconModel";
import CategoryModel from "../../Model/Categories/CategoryModel";

export const createIcon = async ({
  key,
  svg,
  isActive,
}: {
  key: string;
  svg: string;
  isActive?: boolean;
}) => {
  const icon = await IconModel.create({ key, svg, isActive: isActive ?? true });
  return icon;
};

export const findIconById = async (_id: string) => {
  return IconModel.findById(_id);
};

export const findIconByKey = async (key: string) => {
  return IconModel.findOne({ key });
};

export const getAllIcons = async (page: number = 1) => {
  const limit = 20;
  page = !page || page < 1 || isNaN(page) ? 1 : page;
  const skip = limit * (page - 1);
  const totalItems = await IconModel.countDocuments();
  const totalPages = Math.ceil(totalItems / limit);
  const data = await IconModel.find().skip(skip).limit(limit).select("-__v");
  return { data, totalItems, totalPages, currentPage: page };
};

export const prepareIconUpdates = (
  icon: any,
  key?: string,
  svg?: string,
  isActive?: boolean
) => {
  let updated = false;
  if (key !== undefined && key !== icon.key) {
    icon.key = key;
    updated = true;
  }
  if (svg !== undefined && svg !== icon.svg) {
    icon.svg = svg;
    updated = true;
  }
  if (isActive !== undefined && isActive !== icon.isActive) {
    icon.isActive = isActive;
    updated = true;
  }
  return updated ? icon : null;
};

export const deleteIconById = async (_id: string) => {
  const icon = await IconModel.findByIdAndDelete(_id);
  if (icon) {
    await CategoryModel.updateMany({ icon_id: icon._id }, { $set: { icon_id: null } });
  }
  return icon;
};

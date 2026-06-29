import ColorModel from "../../Model/Colors/ColorModel";

export const createColor = async ({ name, hex }: { name: string; hex: string }) => {
  return ColorModel.create({ name, hex });
};

export const findColorById = async (_id: string) => {
  return ColorModel.findById(_id);
};

export const findColorByName = async (name: string) => {
  return ColorModel.findOne({ name });
};

export const getAllColors = async (page?: number, search?: string) => {
  const filter = search ? { name: { $regex: search, $options: "i" } } : {};
  const totalItems = await ColorModel.countDocuments(filter);

  // No page provided → return all colors without pagination
  if (page === undefined) {
    const data = await ColorModel.find(filter).select("-__v");
    return { data, totalItems, totalPages: 1, currentPage: 1 };
  }

  const limit = 20;
  page = page < 1 || isNaN(page) ? 1 : page;
  const skip = limit * (page - 1);
  const totalPages = Math.ceil(totalItems / limit);
  const data = await ColorModel.find(filter).skip(skip).limit(limit).select("-__v");
  return { data, totalItems, totalPages, currentPage: page };
};

export const prepareColorUpdates = (icon: any, name?: string, hex?: string) => {
  let updated = false;
  if (name !== undefined && name !== icon.name) {
    icon.name = name;
    updated = true;
  }
  if (hex !== undefined && hex !== icon.hex) {
    icon.hex = hex;
    updated = true;
  }
  return updated ? icon : null;
};

export const deleteColorById = async (_id: string) => {
  return ColorModel.findByIdAndDelete(_id);
};

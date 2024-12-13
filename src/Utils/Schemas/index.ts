import { Schema, Types } from "mongoose";
import moment from "../DateAndTime";
const RequiredString = {
  type: String,
  required: true,
};
const RequiredUniqueString = {
  type: String,
  required: true,
  unique: true,
};
const RequiredUniqueEmail = {
  type: String,
  required: true,
  toLowerCase: true,
  trim: true,
};
const RequiredUniquePhone = {
  type: String,
  required: true,
  trim: true,
};
const NotRequiredString = {
  type: String,
  default: "",
};
const RequiredBoolean = {
  type: Boolean,
  required: true,
  default: false,
};
const NotRequiredBoolean = {
  type: Boolean,
  required: false,
  default: false,
};
const RequiredNumber = {
  type: Number,
  required: true,
};
const NotRequiredTimeStamp = {
  type: Number,
  required: false,
};
const RequiredUniqueNumber = {
  type: Number,
  required: true,
  unique: true,
};
const NotRequiredNumber = {
  type: Number,
  default: 0,
};
const createdAtTokenModel = {
  type: Date,
  default: () => moment().toDate(),
};
const expiresAtTokenModel = {
  type: Date,
  default: () => moment().add(365, "days").toDate(),
};
const ImageSchema = {
  mediaUrl: { type: String, required: true },
  mediaId: { type: String, required: true },
};
const RequiredSpecificNumber = (specificNumber: number) => {
  return {
    type: Number,
    required: true,
    default: specificNumber,
  };
};
const RefType = (ref: string, required: boolean) => {
  return {
    type: Schema.Types.ObjectId,
    required,
    ref,
    default: null,
  };
};
const StringValidation = (validation: RegExp, message: string) => {
  return {
    type: String,
    required: true,
    validate: {
      validator: function (v: string) {
        return validation.test(v);
      },
      message,
    },
  };
};
const EnumStringRequired = (enumValues: Array<string>, index: number = 0) => {
  return {
    type: String,
    required: true,
    enum: enumValues,
    default: enumValues[index],
  };
};
const EnumStringNotRequired = (enumValues: Array<string>) => {
  return {
    type: String,
    required: false,
    enum: enumValues,
    default: null,
  };
};
const EnumStringRole = (enumValues: Array<string>) => {
  return {
    type: String,
    required: false,
    enum: enumValues,
    default: "user",
  };
};
const EnumStringStatus = (enumValues: Array<string>) => {
  return {
    type: String,
    required: false,
    enum: enumValues,
    default: "offline",
  };
};
import { Query } from "mongoose";

export async function paginate<T>(
  query: Query<T[], T>,
  page: number = 1,
  fields :string,
  path :string
): Promise<{
  data: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}> {
  let limit =20;
  page = !page || page < 1 || isNaN(page) ? 1 : page;
  const skip = limit * (page - 1);
  const totalItems = await query.model.countDocuments(query.getFilter());
  const totalPages = Math.ceil(totalItems / limit);
  const data = await query.skip(skip).limit(limit).populate(path, fields).exec();
  return { totalItems, totalPages, currentPage: page, data };
}

export {
  RequiredString,
  NotRequiredString,
  RequiredBoolean,
  NotRequiredBoolean,
  RequiredNumber,
  NotRequiredNumber,
  RequiredUniqueString,
  RequiredUniqueNumber,
  NotRequiredTimeStamp,
  RequiredUniqueEmail,
  RequiredUniquePhone,
  createdAtTokenModel,
  expiresAtTokenModel,
  ImageSchema,
  RequiredSpecificNumber,
  RefType,
  StringValidation,
  EnumStringRequired,
  EnumStringNotRequired,
  EnumStringStatus,
  EnumStringRole,
};

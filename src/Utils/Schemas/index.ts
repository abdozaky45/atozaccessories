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
const NotRequiredUniqueEmail = {
  type: String,
  required: false,
  toLowerCase: true,
  trim: true,
};
const NotRequiredUniquePhone = {
  type: String,
  required: false,
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
const createdAtTokenModel ={
  type: Date,
  default: () => moment().toDate(),
};
const expiresAtTokenModel = {
  type: Date,
  default: () => moment().add(365, "days").toDate(),
};
const ImageSchema={
  mediaUrl:{type:String ,required:true},
  mediaId:{type:String ,required:true},
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
    type:Schema.Types.ObjectId,
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
    default:"user",
  };
};
const EnumStringStatus = (enumValues: Array<string>) => {
  return {
    type: String,
    required: false,
    enum: enumValues,
    default:"offline",
  };
};
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
  NotRequiredUniqueEmail,
  NotRequiredUniquePhone,
  createdAtTokenModel,
  expiresAtTokenModel,
  ImageSchema,
  RequiredSpecificNumber,
  RefType,
  StringValidation,
  EnumStringRequired,
  EnumStringNotRequired,
  EnumStringStatus,
  EnumStringRole
};
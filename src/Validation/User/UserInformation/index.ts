import joi from "joi";
import { governorateArray } from "../../../Utils/Governorate/GovernorateEnum";
import { baseSchema } from "../../baseSchema";
export const createUser = baseSchema.concat(
  joi
    .object({
      firstName: joi.string().min(3).max(50).required(),
      lastName: joi.string().min(3).max(50).required(),
      address: joi.string().min(3).max(200).required(),
      apartmentSuite: joi.string().min(1).max(200).allow("").optional(),
      shipping: joi.string().required(),
      postalCode: joi.string().min(3).max(6).allow("").optional(),
      primaryPhone: joi.string().pattern(/^(\+?2)?01[0-25]\d{8}$/).required(),
      secondaryPhone: joi.string().pattern(/^(\+?2)?01[0-25]\d{8}$/).allow("").optional(),      
    })
    .required()
);
export const updateUser = baseSchema.concat(
  joi
    .object({
      userId: joi.string().required(),
      firstName: joi.string().min(3).max(50).optional(),
      lastName: joi.string().min(3).max(50).optional(),
      address: joi.string().min(3).max(200).optional(),
      apartmentSuite: joi.string().min(1).max(200).optional().allow(""),
      shipping: joi.string().optional(),
      postalCode: joi.string().min(3).max(6).optional().allow(""),
      primaryPhone: joi.string().pattern(/^(\+?2)?01[0-25]\d{8}$/).optional(),
      secondaryPhone: joi.string().pattern(/^(\+?2)?01[0-25]\d{8}$/).allow("").optional(),
      
    })
    .required()
);
export const CustomUserValidation = baseSchema.concat(
  joi
    .object({
      userId: joi.string().required(),
    })
    .required()
);
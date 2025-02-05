import joi from "joi";
import { governorateArray } from "../../../Utils/Governorate/GovernorateEnum";
import { baseSchema } from "../../baseSchema";
export const createUser = baseSchema.concat(
  joi
    .object({
      firstName: joi.string().min(3).max(50).required(),
      lastName: joi.string().min(3).max(50).required(),
      address: joi.string().min(3).max(200).required(),
      apartmentSuite: joi.string().min(3).max(60).allow("").optional(),
      governorate: joi
        .string()
        .valid(...governorateArray)
        .required(),
      postalCode: joi.string().min(3).max(6).allow("").optional(),
      primaryPhone: joi.string().pattern(/^(\+?2)?01\d{9}$/).required(),
      secondaryPhone: joi.string().pattern(/^(\+?2)?01\d{9}$/).allow("").optional(),
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
      apartmentSuite: joi.string().min(3).max(60).optional(),
      governorate: joi
        .string()
        .valid(...governorateArray)
        .optional(),
      postalCode: joi.string().min(3).max(6).optional(),
      primaryPhone: joi
        .string()
        .pattern(/^(\+?2)?01\d{9}$/)
        .optional(),
      secondaryPhone: joi
        .string()
        .pattern(/^(\+?2)?01\d{9}$/)
        .optional(),
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
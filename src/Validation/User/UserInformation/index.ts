import joi from "joi";
import { governorateArray } from "../../../Utils/Governorate";
export const createUser = joi
  .object({
    firstName: joi.string().min(3).max(50).required(),
    lastName: joi.string().min(3).max(50).required(),
    address: joi.string().min(3).max(200).required(),
    apartmentSuite: joi.string().min(3).max(60).optional(),
    governorate: joi
      .string()
      .valid(...governorateArray)
      .required(),
    postalCode: joi.string().min(3).max(6).optional(),
    primaryPhone: joi
      .string()
      .pattern(/^\+20\d{10}$/)
      .required(),
    secondaryPhone: joi
      .string()
      .pattern(/^\+20\d{10}$/)
      .optional(),
  })
  .required();

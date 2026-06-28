import joi from "joi";
import { baseSchema } from "../baseSchema";
export const createVideoValidation = baseSchema.concat(
  joi.object({
    videoUrl: joi.string().required(),
  })
);
export const deleteVideoValidation = baseSchema.concat(
  joi.object({
    id: joi.string().required(),
  })
);

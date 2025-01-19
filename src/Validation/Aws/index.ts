import joi from 'joi';
import { baseSchema } from '../BaseSchema';
export const deletePresignedUrlValidation = baseSchema.concat(
    joi.object({
        fileName: joi.string().required(),
    }).required()
);
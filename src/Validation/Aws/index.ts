import joi from 'joi';
import { baseSchema } from '../baseSchema';
export const deletePresignedUrlValidation = baseSchema.concat(
    joi.object({
        fileName: joi.string().required(),
    }).required()
);
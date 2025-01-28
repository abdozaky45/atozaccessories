import joi from 'joi';
import { baseSchema } from '../baseSchema';
import { DeviceTypeArr } from '../../Utils/DeviceType';
export const createImageSliderValidation = baseSchema.concat(joi.object({
    images: joi.object({
        image1: joi.object({
            imageUrl: joi.string().required(),
            imageType: joi.string().valid(...DeviceTypeArr).required()
        }),
        image2: joi.object({
            imageUrl: joi.string().required(),
            imageType: joi.string().valid(...DeviceTypeArr).required()
        })
    }).required()
}));
export const updateImageSliderValidation = baseSchema.concat(joi.object({
    id: joi.string().required(),
    images: joi.object({
        image1: joi.object({
            imageUrl: joi.string().optional(),
            imageType: joi.string().valid(...DeviceTypeArr).optional()
        }),
        image2: joi.object({
            imageUrl: joi.string().optional(),
            imageType: joi.string().valid(...DeviceTypeArr).optional()
        })
    }).required()
}));
export const deleteImageSliderValidation = baseSchema.concat(joi.object({
    id: joi.string().required()
}));
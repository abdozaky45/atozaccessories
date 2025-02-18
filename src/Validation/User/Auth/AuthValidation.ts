import joi from "joi";
export const AuthValidationEmail = joi.object({
    email: joi.string().required(),
}).required();
export const activeAccount = joi.object({
    email: joi.string().required(),
    activeCode: joi.string().required()
}).required();

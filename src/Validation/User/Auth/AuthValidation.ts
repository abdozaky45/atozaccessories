import joi from "joi";
export const AuthValidationEmail = joi.object({
    email: joi
        .string()
        .email({
            minDomainSegments: 2,
            maxDomainSegments: 4,
            tlds: { allow: false }
        })
        .required(),
}).required();
export const activeAccount = joi.object({
    email: joi
        .string()
        .email({
            minDomainSegments: 2,
            maxDomainSegments: 4,
            tlds: { allow: false }
        })
        .required(),
    activeCode: joi.string().required()
}).required();

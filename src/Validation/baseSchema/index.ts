import joi from "joi";

export const baseSchema = joi.object({
  currentUser: joi
    .object({
      userInfo: joi.object({
        _id: joi.string().required(),
        role: joi.string().required(),
        email: joi.string().email().required(),
        iat: joi.number().required(),
        exp: joi.number().required(),
      }).required(),
      token: joi.string().required(),
    })
    .required(),
});

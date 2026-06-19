import joi from "joi";

export const baseSchema = joi.object({
  // `currentUser` is injected by checkAuthority on protected routes; it is optional
  // here so the same schemas can run on public routes too. Actual auth is enforced
  // by the middleware, not by this validation.
  currentUser: joi
    .object({
      userInfo: joi.object({
        _id: joi.string().required(),
        role: joi.string().required(),
        email: joi.string().email().required(),
        iat: joi.number().required(),
        // Regular-user tokens never expire, so `exp` is absent for them.
        exp: joi.number().optional(),
      }).required(),
      token: joi.string().required(),
    })
    .optional(),
});

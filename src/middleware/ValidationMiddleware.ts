import { Request, Response, NextFunction } from "express";
import ErrorMessages from "../Utils/Error";

export const Validation = (joiValidation: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const AllMethodData = { ...req.body, ...req.params, ...req.query };
    const validationResult = joiValidation.validate(AllMethodData, {
      abortEarly: false,
    });
    if (validationResult.error) {
      return res.status(400).json({
        statusCode: 400,
        message: "Validation Error!",
        errors: validationResult.error.details,
        success: false,
      });
    }
    return next();
  };
};

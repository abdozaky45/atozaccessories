import {Schema , model} from "mongoose";
import CategoryInterFaceModel from "./CategoryInterFaceModel";
import { ImageSchema, RefType, RequiredNumber, RequiredString } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
const CategorySchema = new Schema<CategoryInterFaceModel>({
    categoryName:RequiredString,
    slug:RequiredString,
    image:ImageSchema,
    createdBy:RefType(SchemaTypesReference.User,true),
    createdAt:RequiredNumber
});
const CategoryModel = model(SchemaTypesReference.Category,CategorySchema);
export default CategoryModel;
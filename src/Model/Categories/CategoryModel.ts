import {Schema , model} from "mongoose";
import ICategory from "./Icategory";
import { ImageSchema, RefType, RequiredNumber, RequiredString } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
const CategorySchema = new Schema<ICategory>({
    categoryName:RequiredString,
    slug:RequiredString,
    image:ImageSchema,
    createdBy:RefType(SchemaTypesReference.User,true),
    createdAt:RequiredNumber
});
const CategoryModel = model(SchemaTypesReference.Category,CategorySchema);
export default CategoryModel;
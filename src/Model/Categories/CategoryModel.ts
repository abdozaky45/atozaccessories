import {Schema , model} from "mongoose";
import ICategory from "./Icategory";
import { ImageSchema, NotRequiredBoolean, RefType, RequiredNumber, RequiredString } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
const CategorySchema = new Schema<ICategory>({
    categoryName:RequiredString,
    slug:RequiredString,
    image:ImageSchema,
    createdBy:RefType(SchemaTypesReference.User,true),
    createdAt:RequiredNumber,
    isDeleted:NotRequiredBoolean,
    icon_id: { type: Schema.Types.ObjectId, ref: SchemaTypesReference.Icon, required: false, default: null },
});
const CategoryModel = model(SchemaTypesReference.Category,CategorySchema);
export default CategoryModel;
import mongoose,{connect} from "mongoose";
import "dotenv/config";
import setupAgenda from "../Model/Product/ProductAgenda";
const Db_Connection = process.env.DB_URL ?? "Not connected to DB";
const DbConnection = async () => {
   try {
    mongoose.set("strictQuery",false);
      await connect(Db_Connection);
      console.log("DB Connected");
      await setupAgenda(Db_Connection)
   }
   catch (error) {
      console.log(error);
   }
};
export default DbConnection;
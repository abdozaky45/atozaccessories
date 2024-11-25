import mongoose,{connect} from "mongoose";
import "dotenv/config";
const Db_Connection = process.env.DB_URL ?? "Not connected to DB";
const DbConnection = async () => {
   try {
    mongoose.set("strictQuery",false);
      await connect(Db_Connection);
      console.log("DB Connected");
   }
   catch (error) {
      console.log(error);
   }
};
export default DbConnection;
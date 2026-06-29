import dns from "dns";
import mongoose, { connect } from "mongoose";
import "dotenv/config";
import { registerJobs } from "../jobs";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const Db_Connection = process.env.DB_URL ?? "Not connected to DB";

const DbConnection = async () => {
  try {
    mongoose.set("strictQuery", false);
    await connect(Db_Connection);
    console.log("DB Connected");

    await registerJobs();
  } catch (error) {
    console.log(error);
  }
};

export default DbConnection;

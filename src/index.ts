import "dotenv/config";
import { app } from "./app";
import DbConnection from "./DbSetup/DbConfig";
import { findUserInformationById } from "./Service/User/AuthService";
DbConnection();
app.listen(process.env.PORT,async() => {
 
  console.log(`server is running on port ${process.env.PORT}`);
});

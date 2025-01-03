import "dotenv/config";
import { app } from "./app";
import DbConnection from "./DbSetup/DbConfig";
DbConnection();
app.listen(process.env.PORT,() => {
  console.log(`server is running on port ${process.env.PORT}`);
});

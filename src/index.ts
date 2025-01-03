import "dotenv/config";
import { app } from "./app";
import DbConnection from "./DbSetup/DbConfig";
import { sendEmail } from "./Utils/Nodemailer/SendEmail";
import { orderInvoiceTemplate } from "./Utils/Nodemailer/SendInvoice";
DbConnection();
app.listen(process.env.PORT, async () => {
  // const items = [
  //   { name: "Pizza Margherita", quantity: 2, price: 12.0 },
  //   { name: "Garlic Bread", quantity: 1, price: 5.0 },
  // ];
  // const deliveryFee = 2.5;
  // const serviceFee = 1.5;
  // const total = 31.0;
  // const orderNumber = "12345";
  // const orderDate = "2025-01-03 10:30 AM";
  // const paymentMethod = "Credit Card";

  // const htmlContent = orderInvoiceTemplate(
  //   "zakiCode",
  //   "atozaccessorice",
  //   items,
  //   deliveryFee,
  //   serviceFee,
  //   total,
  //   orderNumber,
  //   orderDate,
  //   paymentMethod
  // );
  // const x = await sendEmail({
  //   to: "aa1066649@gmail.com",
  //   subject: "Order Invoice",
  //   html: htmlContent
  // });
  console.log(`server is running on port ${process.env.PORT}`);
});

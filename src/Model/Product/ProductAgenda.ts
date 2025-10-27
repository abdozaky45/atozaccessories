import Agenda from "agenda";
import ProductModel from "./ProductModel";
const setupAgenda = async (DB_URL: string) => {
  const agenda = new Agenda({ db: { address: DB_URL, collection: "jobs" } });
  agenda.define("update-expired-products", async () => {
    try {
      console.log("Checking for expired products...");
      const now = new Date().valueOf();
      const expiredProducts = await ProductModel.find({
        expiredSale: { $lt: now },
      });

      for (const product of expiredProducts) {
        product.expiredSale = 0;
        product.salePrice = 0;
        product.discount = 0;
        product.discountPercentage = 0;
        product.isSale = false;
        await product.save();
        console.log(`Product ${product._id} updated successfully`);
      }
    } catch (error) {
      console.error("Error updating expired products:", error);
    }
  });
  // await agenda.start();
  // await agenda.every("1 week", "update-expired-products");
};
export default setupAgenda;

import Redis from "ioredis";
import { Queue, Worker, QueueEvents, Job } from "bullmq";
import ProductModel from "../../Model/Product/ProductModel";

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 10192,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

redis.on("connect", () => {
  console.log("Connected to Redis successfully");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

const productQueue = new Queue("productQueue", {
  connection: redis,
});

const productWorker = new Worker(
  "productQueue",
  async (job) => {
    const { productId } = job.data;
    const product = await ProductModel.findById(productId);
    if (product) {
      product.expiredSale = 0;
      product.salePrice = 0;
      product.discount = 0;
      product.discountPercentage = 0;
      await product.save();
      console.log(`Product ${productId} updated successfully`);
    }
  },
  {
    connection: redis,
  }
);

const scheduleProductUpdate = async (productId: string, delayInMs: number) => {
  const jobId = `product_${productId}`;
  console.log(`Scheduling job for productId: ${productId}`);
  const existingJob: Job | undefined = await productQueue.getJob(jobId);
  console.log(`Existing job for productId: ${productId}`, existingJob);

  if (existingJob) {
    console.log(`Removing existing job for productId: ${productId}`);
    await existingJob.remove();
  }

  await productQueue.add(
    jobId, 
    { productId },
    {
      delay: delayInMs, 
      attempts: 3, 
      removeOnComplete: true, 
      removeOnFail: true, 
    }
  );

  console.log(`Scheduled job for productId: ${productId} with delay: ${delayInMs}ms`);
};

const productQueueEvents = new QueueEvents("productQueue", { connection: redis });

productQueueEvents.on("completed", (event) => {
  console.log(`Job ${event.jobId} completed successfully`);
});

productQueueEvents.on("failed", (event) => {
  console.error(`Job ${event.jobId} failed with reason: ${event.failedReason}`);
});
export { scheduleProductUpdate };

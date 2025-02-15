import cors from "cors";
import dotenv from "dotenv";
dotenv.config(); 
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
export function getCorsOptions(): cors.CorsOptions {
  return {
    origin: (origin) => !origin || allowedOrigins.includes(origin) ? true : new Error("Not allowed by CORS"),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  };
}

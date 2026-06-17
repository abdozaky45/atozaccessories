import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
console.log("Allowed originss: ", allowedOrigins);
export function getCorsOptions(): cors.CorsOptions {
    // DEV: allow all origins
    return {
        origin: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    };
}

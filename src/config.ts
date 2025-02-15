import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
console.log("Allowed originss: ", allowedOrigins);
export function getCorsOptions(): cors.CorsOptions {
    return {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    };
}

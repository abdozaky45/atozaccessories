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

// Public storefront origin — where the share endpoint bounces real users (and
// the canonical product URL). Override via env per environment; trailing slash
// is stripped so we can safely append paths.
export const STOREFRONT_URL = (
    process.env.STOREFRONT_URL || "https://www.atozaccessory.com"
)
    .trim()
    .replace(/\/+$/, "");

// Frontend product page is /product/:id (singular).
export const getStorefrontProductUrl = (id: string) =>
    `${STOREFRONT_URL}/product/${id}`;

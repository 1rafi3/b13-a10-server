import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { db } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
process.env.NODE_ENV = isProd ? "production" : "development";

if (!process.env.BETTER_AUTH_URL) {
  process.env.BETTER_AUTH_URL = isProd
    ? "https://server-tawny-sigma.vercel.app"
    : "http://localhost:5000";
}

const trustedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5000"
];

if (process.env.CLIENT_URL) {
  // Normalize by removing trailing slash if present
  trustedOrigins.push(process.env.CLIENT_URL.replace(/\/$/, ""));
}
trustedOrigins.push("https://client-two-omega-46.vercel.app");
trustedOrigins.push("https://client-jmgezjo1p-rwolkorimrafi-1631s-projects.vercel.app");
trustedOrigins.push("https://a10-recipehub-client-roan.vercel.app");
trustedOrigins.push("https://a10-recipehub-client-la2sj4mew-rwolkorimrafi-1631s-projects.vercel.app");

export const auth = betterAuth({
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-google-client-secret",
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || "recipehub-auth-secret-key-for-session-signing-2026",
  trustedOrigins: trustedOrigins,
  advanced: {
    cookie: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production"
    }
  }
});

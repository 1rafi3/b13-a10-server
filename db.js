import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, ".env") });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.warn("MONGODB_URI is not defined in environment variables! Queries will fail.");
} else {
  console.log("Connecting to MongoDB Atlas...");
  try {
    await mongoose.connect(uri);
    console.log("Mongoose connected successfully to MongoDB.");
  } catch (error) {
    console.error("Failed to connect to MongoDB during startup:", error.message);
  }
}

export const db = mongoose.connection.db;
export const client = mongoose.connection.getClient ? mongoose.connection.getClient() : null;
export default mongoose;

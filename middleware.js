import jwt from "jsonwebtoken";
import { auth } from "./auth.js";
import User from "./models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "recipehub-jwt-secret-key-2026";

export async function verifyJWT(req, res, next) {
  const token = req.cookies.jwt_token;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Fetch user from DB to check if blocked or check their role
      const dbUser = await User.findOne({ email: decoded.email });
      if (!dbUser) {
        return res.status(401).json({ message: "User not found in database." });
      }

      if (dbUser.isBlocked) {
        return res.status(403).json({ message: "Forbidden: Your account has been blocked by an administrator." });
      }

      // Populate user info with the latest database state
      req.user = {
        id: dbUser._id.toString(),
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
        role: dbUser.role,
        isBlocked: dbUser.isBlocked,
        isPremium: dbUser.isPremium,
      };
      
      return next();
    } catch (err) {
      console.warn("JWT Verification failed, checking Better Auth session fallback...");
    }
  }

  // Fallback: Check Better Auth Session directly
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (session && session.user) {
      const dbUser = await User.findOne({ email: session.user.email });
      if (!dbUser) {
        return res.status(401).json({ message: "User session exists but user not found in database." });
      }

      if (dbUser.isBlocked) {
        return res.status(403).json({ message: "Forbidden: Your account has been blocked by an administrator." });
      }

      req.user = {
        id: dbUser._id.toString(),
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
        role: dbUser.role,
        isBlocked: dbUser.isBlocked,
        isPremium: dbUser.isPremium,
      };
      
      return next();
    }
  } catch (err) {
    console.error("Better Auth session verification failed:", err);
  }

  return res.status(401).json({ message: "Unauthorized: Please log in." });
}

export async function verifyAdmin(req, res, next) {
  // Must run verifyJWT first to populate req.user
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized: Access verification failed." });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Access denied. Administrators only." });
  }

  next();
}

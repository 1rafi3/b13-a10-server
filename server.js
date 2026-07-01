import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
process.env.NODE_ENV = isProd ? "production" : "development";
import dbConnection from "./db.js"; // Ensures DB is connected
import { auth } from "./auth.js";
import { verifyJWT, verifyAdmin } from "./middleware.js";
import { seedDatabase } from "./seed.js";

// Trigger automatic seeding check
seedDatabase().catch(err => console.error("Seed database error:", err));


// Models
import User from "./models/User.js";
import Recipe from "./models/Recipe.js";
import Favorite from "./models/Favorite.js";
import Report from "./models/Report.js";
import Payment from "./models/Payment.js";

const app = express();

app.get("/", (req, res) => {
  res.send("RecipeHub API Server is running successfully!");
});
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "recipehub-jwt-secret-key-2026";

// Initialize Stripe if secret is set and valid
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes("N8N8N8")) {
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch (err) {
    console.warn("Failed to initialize Stripe with provided key, using Mock Mode instead:", err.message);
  }
}

// CORS Config
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5000"
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, postman, or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowedOrigins or is a vercel.app subdomain
    if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(cookieParser());

// Mount Better Auth handler BEFORE express.json() body parsing
app.all("/api/auth/*", (req, res, next) => {
  if (req.path === "/api/auth/jwt" || req.path === "/api/auth/logout") {
    return next();
  }
  return toNodeHandler(auth)(req, res);
});



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// AUTH SYNC & LOGOUT
// ==========================================

// Exchange Better Auth session for custom JWT HttpOnly cookie
app.post("/api/auth/jwt", async (req, res) => {
  try {
    const sessionRes = await auth.api.getSession({ headers: req.headers });
    if (!sessionRes || !sessionRes.user) {
      return res.status(401).json({ message: "No active session found" });
    }

    const user = sessionRes.user;

    // Check if user exists in our DB, if not create them (Better Auth usually handles this, but sync is safe)
    let dbUser = await User.findOne({ email: user.email });
    if (!dbUser) {
      dbUser = await User.create({
        name: user.name,
        email: user.email,
        image: user.image || "",
        role: "user",
        isBlocked: false,
        isPremium: false
      });
    }

    if (dbUser.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked by the admin." });
    }

    const token = jwt.sign(
      {
        id: dbUser._id.toString(),
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
        role: dbUser.role,
        isPremium: dbUser.isPremium
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("jwt_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({ success: true, user: dbUser });
  } catch (error) {
    console.error("JWT Sync Error:", error);
    return res.status(500).json({ message: "Error generating JWT token", error: error.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("jwt_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  });
  return res.json({ success: true, message: "Logged out successfully" });
});

// ==========================================
// USER PROFILE ROUTES
// ==========================================

// Update user details
app.put("/api/users/profile", verifyJWT, async (req, res) => {
  const { name, image } = req.body;
  try {
    const updatedUser = await User.findOneAndUpdate(
      { email: req.user.email },
      { $set: { name, image } },
      { new: true }
    );

    // Re-sign cookie with new info
    const token = jwt.sign(
      {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        name: updatedUser.name,
        image: updatedUser.image,
        role: updatedUser.role,
        isPremium: updatedUser.isPremium
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("jwt_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({ success: true, user: updatedUser });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
});

// ==========================================
// RECIPES ROUTES
// ==========================================

// Get popular recipes (sorted by likesCount desc)
app.get("/api/recipes/popular", async (req, res) => {
  try {
    const popular = await Recipe.find({ status: "active" })
      .sort({ likesCount: -1 })
      .limit(6);
    return res.json(popular);
  } catch (error) {
    return res.status(500).json({ message: "Failed to get popular recipes", error: error.message });
  }
});

// Get featured recipes
app.get("/api/recipes/featured", async (req, res) => {
  try {
    const featured = await Recipe.find({ isFeatured: true, status: "active" }).limit(6);
    return res.json(featured);
  } catch (error) {
    return res.status(500).json({ message: "Failed to get featured recipes", error: error.message });
  }
});

// GET all recipes (with search, category multi-select filter & pagination)
app.get("/api/recipes", async (req, res) => {
  try {
    const { category, search, page = 1, limit = 9 } = req.query;
    const filter = { status: "active" };

    // Search query by name
    if (search) {
      filter.recipeName = { $regex: search, $options: "i" };
    }

    // Category filter using MongoDB $in operator
    if (category) {
      const categories = Array.isArray(category)
        ? category
        : category.split(",").map((c) => c.trim()).filter(Boolean);
      if (categories.length > 0) {
        filter.category = { $in: categories };
      }
    }

    const currentPage = parseInt(page);
    const limitPerPage = parseInt(limit);
    const skip = (currentPage - 1) * limitPerPage;

    const totalRecipes = await Recipe.countDocuments(filter);
    const recipes = await Recipe.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitPerPage);

    return res.json({
      recipes,
      total: totalRecipes,
      pages: Math.ceil(totalRecipes / limitPerPage),
      currentPage
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch recipes", error: error.message });
  }
});

// GET user's own recipes
app.get("/api/recipes/my-recipes", verifyJWT, async (req, res) => {
  try {
    const myRecipes = await Recipe.find({ authorEmail: req.user.email }).sort({ createdAt: -1 });
    return res.json(myRecipes);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch your recipes", error: error.message });
  }
});

// GET recipe details
app.get("/api/recipes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const recipe = await Recipe.findById(id);
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Check purchase authorization
    let isAuthorized = false;
    let isPurchased = false;

    if (recipe.price === 0) {
      isAuthorized = true;
    } else {
      // Check if user is logged in
      const cookieToken = req.cookies.jwt_token;
      let userEmail = null;
      let userId = null;

      if (cookieToken) {
        try {
          const decoded = jwt.verify(cookieToken, JWT_SECRET);
          userEmail = decoded.email;
          userId = decoded.id;
        } catch (_) {}
      } else {
        // Try fallback Better Auth session
        try {
          const session = await auth.api.getSession({ headers: req.headers });
          if (session && session.user) {
            userEmail = session.user.email;
            userId = session.user.id;
          }
        } catch (_) {}
      }

      if (userEmail) {
        // Author can view own recipe
        if (recipe.authorEmail === userEmail) {
          isAuthorized = true;
          isPurchased = true;
        } else {
          // Check if admin
          const dbUser = await User.findOne({ email: userEmail });
          if (dbUser && dbUser.role === "admin") {
            isAuthorized = true;
            isPurchased = true;
          } else {
            // Check payment collection
            const payment = await Payment.findOne({
              userEmail,
              recipeId: recipe._id,
              paymentStatus: "succeeded"
            });
            if (payment) {
              isAuthorized = true;
              isPurchased = true;
            }
          }
        }
      }
    }

    const resultRecipe = recipe.toObject();

    // If premium/paid recipe and user is not authorized, hide ingredients and instructions
    if (!isAuthorized) {
      resultRecipe.ingredients = [];
      resultRecipe.instructions = [];
      resultRecipe.isLocked = true;
    } else {
      resultRecipe.isLocked = false;
    }

    resultRecipe.isPurchased = isPurchased;

    return res.json(resultRecipe);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching recipe details", error: error.message });
  }
});

// POST create recipe
app.post("/api/recipes", verifyJWT, async (req, res) => {
  const { recipeName, recipeImage, category, cuisineType, difficultyLevel, preparationTime, ingredients, instructions, price } = req.body;

  if (!recipeName || !recipeImage || !category || !cuisineType || !difficultyLevel || !preparationTime || !ingredients || !instructions) {
    return res.status(400).json({ message: "Please fill all required fields" });
  }

  try {
    // Normal user limit check: Max 2 recipes unless they are Premium members
    const ownRecipeCount = await Recipe.countDocuments({ authorEmail: req.user.email });
    
    if (ownRecipeCount >= 2 && !req.user.isPremium && req.user.role !== "admin") {
      return res.status(400).json({
        message: "Recipe limit reached! Standard members can only add up to 2 recipes. Upgrade to Premium for unlimited publishing."
      });
    }

    const newRecipe = await Recipe.create({
      recipeName,
      recipeImage,
      category,
      cuisineType,
      difficultyLevel,
      preparationTime: parseInt(preparationTime),
      ingredients: Array.isArray(ingredients) ? ingredients : ingredients.split("\n").filter(Boolean),
      instructions: Array.isArray(instructions) ? instructions : instructions.split("\n").filter(Boolean),
      authorId: req.user.id,
      authorName: req.user.name,
      authorEmail: req.user.email,
      likesCount: 0,
      isFeatured: false,
      status: "active",
      price: price ? parseFloat(price) : 0
    });

    return res.status(201).json({ message: "Recipe created successfully!", recipe: newRecipe });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create recipe", error: error.message });
  }
});

// PUT update recipe
app.put("/api/recipes/:id", verifyJWT, async (req, res) => {
  const { id } = req.params;
  const { recipeName, recipeImage, category, cuisineType, difficultyLevel, preparationTime, ingredients, instructions, price } = req.body;

  try {
    const recipe = await Recipe.findById(id);
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Verify ownership or admin role
    if (recipe.authorEmail !== req.user.email && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: You are not authorized to update this recipe." });
    }

    const updatedData = {
      recipeName,
      recipeImage,
      category,
      cuisineType,
      difficultyLevel,
      preparationTime: preparationTime ? parseInt(preparationTime) : undefined,
      ingredients: ingredients ? (Array.isArray(ingredients) ? ingredients : ingredients.split("\n").filter(Boolean)) : undefined,
      instructions: instructions ? (Array.isArray(instructions) ? instructions : instructions.split("\n").filter(Boolean)) : undefined,
      price: price !== undefined ? parseFloat(price) : undefined,
    };

    // Remove undefined fields
    Object.keys(updatedData).forEach(key => updatedData[key] === undefined && delete updatedData[key]);

    const updatedRecipe = await Recipe.findByIdAndUpdate(id, { $set: updatedData }, { new: true });
    return res.json({ message: "Recipe updated successfully", recipe: updatedRecipe });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update recipe", error: error.message });
  }
});

// DELETE recipe
app.delete("/api/recipes/:id", verifyJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const recipe = await Recipe.findById(id);
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Verify ownership or admin role
    if (recipe.authorEmail !== req.user.email && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: You are not authorized to delete this recipe." });
    }

    await Recipe.findByIdAndDelete(id);
    
    // Clean up related favorites and reports
    await Favorite.deleteMany({ recipeId: id });
    await Report.deleteMany({ recipeId: id });

    return res.json({ message: "Recipe deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete recipe", error: error.message });
  }
});

// ==========================================
// LIKES, FAVORITES & REPORTS
// ==========================================

// Like a recipe
app.post("/api/recipes/:id/like", verifyJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const recipe = await Recipe.findByIdAndUpdate(
      id,
      { $inc: { likesCount: 1 } },
      { new: true }
    );
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }
    return res.json({ success: true, likesCount: recipe.likesCount });
  } catch (error) {
    return res.status(500).json({ message: "Error liking recipe", error: error.message });
  }
});

// Add/Toggle Favorite
app.post("/api/recipes/:id/favorite", verifyJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const recipe = await Recipe.findById(id);
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    const existingFavorite = await Favorite.findOne({
      userId: req.user.id,
      recipeId: id
    });

    if (existingFavorite) {
      // Toggle off: Remove
      await Favorite.findByIdAndDelete(existingFavorite._id);
      return res.json({ success: true, favorited: false, message: "Removed from favorites." });
    } else {
      // Toggle on: Add
      await Favorite.create({
        userId: req.user.id,
        userEmail: req.user.email,
        recipeId: id
      });
      return res.json({ success: true, favorited: true, message: "Added to favorites!" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Error updating favorites", error: error.message });
  }
});

// Get user's favorites
app.get("/api/favorites", verifyJWT, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user.id })
      .populate("recipeId")
      .exec();

    // Filter out favorites whose recipes might have been deleted in the database
    const validFavorites = favorites.filter(fav => fav.recipeId !== null);
    
    return res.json(validFavorites);
  } catch (error) {
    return res.status(500).json({ message: "Error retrieving favorites", error: error.message });
  }
});

// Remove favorite directly
app.delete("/api/favorites/:id", verifyJWT, async (req, res) => {
  const { id } = req.params; // Expects favorite ID, not recipe ID
  try {
    await Favorite.findOneAndDelete({ _id: id, userId: req.user.id });
    return res.json({ success: true, message: "Removed from favorites." });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting favorite", error: error.message });
  }
});

// Report a recipe
app.post("/api/recipes/:id/report", verifyJWT, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || !["Spam", "Offensive Content", "Copyright Issue"].includes(reason)) {
    return res.status(400).json({ message: "Please provide a valid report reason." });
  }

  try {
    const recipe = await Recipe.findById(id);
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    const report = await Report.create({
      recipeId: id,
      reporterEmail: req.user.email,
      reason,
      status: "pending"
    });

    return res.status(201).json({ success: true, message: "Recipe reported successfully. Thank you for keeping the platform safe.", report });
  } catch (error) {
    return res.status(500).json({ message: "Error creating report", error: error.message });
  }
});

// ==========================================
// STRIPE & PAYMENT ROUTES
// ==========================================

// Create checkout session
app.post("/api/payments/create-checkout-session", verifyJWT, async (req, res) => {
  const { type, recipeId } = req.body; // type: 'membership' | 'recipe'

  try {
    let amount = 0;
    let description = "";
    let metadata = {
      userId: req.user.id,
      userEmail: req.user.email,
      type
    };

    if (type === "membership") {
      amount = 10; // $10 for premium membership
      description = "RecipeHub Premium Lifetime Membership";
    } else if (type === "recipe") {
      if (!recipeId) {
        return res.status(400).json({ message: "Recipe ID is required for recipe purchase" });
      }
      const recipe = await Recipe.findById(recipeId);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      amount = recipe.price;
      description = `Purchase Recipe: ${recipe.recipeName}`;
      metadata.recipeId = recipeId;
    } else {
      return res.status(400).json({ message: "Invalid payment type" });
    }

    // Mock Mode Fallback:
    // If Stripe is not configured or fails, we generate a mock session ID
    if (!stripe) {
      const mockSessionId = `mock_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log("Stripe mock mode active. Session generated:", mockSessionId);
      return res.json({ id: mockSessionId, isMock: true });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: description,
            },
            unit_amount: Math.round(amount * 100), // In cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.origin || "http://localhost:5173"}/payment-success?session_id={CHECKOUT_SESSION_ID}&is_mock=false`,
      cancel_url: `${req.headers.origin || "http://localhost:5173"}/payment-cancel`,
      metadata
    });

    return res.json({ id: session.id, url: session.url, isMock: false });
  } catch (error) {
    console.error("Create Checkout Session error:", error);
    // Even if Stripe errors out due to bad key, return Mock to keep user testing functional!
    const mockSessionId = `mock_session_err_${Date.now()}`;
    return res.json({ id: mockSessionId, isMock: true, warning: "Stripe error fallback used" });
  }
});

// Confirm Stripe or Mock payment
app.post("/api/payments/confirm-payment", verifyJWT, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ message: "Session ID is required." });
  }

  try {
    let type, userEmail, userId, recipeId, amount, transactionId;

    if (sessionId.startsWith("mock_session")) {
      // Mock payment confirmation
      console.log("Confirming mock payment for session:", sessionId);
      transactionId = `tx_mock_${Date.now()}`;
      userEmail = req.user.email;
      userId = req.user.id;

      if (sessionId.includes("err") || req.body.mockType === "membership" || !req.body.recipeId) {
        type = "membership";
        amount = 10;
        recipeId = null;
      } else {
        type = "recipe";
        amount = parseFloat(req.body.mockAmount) || 5;
        recipeId = req.body.recipeId;
      }
    } else {
      // Real Stripe session verification
      if (!stripe) {
        return res.status(500).json({ message: "Stripe client is not initialized." });
      }
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found." });
      }

      if (session.payment_status !== "paid") {
        return res.status(400).json({ message: "Session has not been paid." });
      }

      type = session.metadata.type;
      userEmail = session.metadata.userEmail;
      userId = session.metadata.userId;
      recipeId = session.metadata.recipeId || null;
      amount = session.amount_total / 100;
      transactionId = session.payment_intent || sessionId;
    }

    // Deduplicate transaction to prevent double upgrades/records
    const existingPayment = await Payment.findOne({ transactionId });
    if (existingPayment) {
      return res.json({ success: true, message: "Payment already confirmed previously.", payment: existingPayment });
    }

    // Save payment details in Mongoose collection
    const payment = await Payment.create({
      userEmail,
      userId,
      amount,
      recipeId: recipeId || undefined,
      isMembership: type === "membership",
      transactionId,
      paymentStatus: "succeeded",
      paidAt: new Date()
    });

    if (type === "membership") {
      // Upgrade User in db
      await User.findByIdAndUpdate(userId, { $set: { isPremium: true } });
      
      // Update cookie user data
      const dbUser = await User.findById(userId);
      const token = jwt.sign(
        {
          id: dbUser._id.toString(),
          email: dbUser.email,
          name: dbUser.name,
          image: dbUser.image,
          role: dbUser.role,
          isPremium: dbUser.isPremium
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("jwt_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }

    return res.json({ success: true, message: "Payment confirmed successfully", payment });
  } catch (error) {
    console.error("Confirm Payment Error:", error);
    return res.status(500).json({ message: "Failed to confirm payment", error: error.message });
  }
});

// GET user's purchased recipes
app.get("/api/payments/my-purchased", verifyJWT, async (req, res) => {
  try {
    const purchased = await Payment.find({
      userEmail: req.user.email,
      isMembership: false,
      paymentStatus: "succeeded"
    })
      .populate("recipeId")
      .exec();

    // Filter out payments where the recipe was deleted
    const validPurchases = purchased.filter(p => p.recipeId !== null);
    return res.json(validPurchases);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch purchased recipes", error: error.message });
  }
});

// ==========================================
// ADMIN DASHBOARD
// ==========================================

// Get admin stats overview
app.get("/api/admin/overview", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalRecipes = await Recipe.countDocuments();
    const totalPremium = await User.countDocuments({ isPremium: true });
    const totalReports = await Report.countDocuments({ status: "pending" });

    return res.json({
      totalUsers,
      totalRecipes,
      totalPremium,
      totalReports
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch admin dashboard overview", error: error.message });
  }
});

// List users
app.get("/api/admin/users", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve user list", error: error.message });
  }
});

// Block User
app.put("/api/admin/users/:id/block", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { $set: { isBlocked: true } }, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.json({ success: true, message: `${user.name} has been blocked successfully.`, user });
  } catch (error) {
    return res.status(500).json({ message: "Failed to block user", error: error.message });
  }
});

// Unblock User
app.put("/api/admin/users/:id/unblock", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { $set: { isBlocked: false } }, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.json({ success: true, message: `${user.name} has been unblocked successfully.`, user });
  } catch (error) {
    return res.status(500).json({ message: "Failed to unblock user", error: error.message });
  }
});

// List all recipes for admin management
app.get("/api/admin/recipes", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const recipes = await Recipe.find().sort({ createdAt: -1 });
    return res.json(recipes);
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve recipes", error: error.message });
  }
});

// Feature Recipe toggle
app.put("/api/admin/recipes/:id/feature", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await Recipe.findById(id);
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found." });
    }

    const updatedRecipe = await Recipe.findByIdAndUpdate(
      id,
      { $set: { isFeatured: !recipe.isFeatured } },
      { new: true }
    );

    return res.json({
      success: true,
      message: updatedRecipe.isFeatured
        ? "Recipe has been added to featured list."
        : "Recipe has been removed from featured list.",
      recipe: updatedRecipe
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update recipe featured status", error: error.message });
  }
});

// List recipe reports
app.get("/api/admin/reports", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const reports = await Report.find({ status: "pending" })
      .populate("recipeId")
      .sort({ createdAt: -1 });
    return res.json(reports);
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve recipe reports", error: error.message });
  }
});

// Remove recipe from admin dashboard (moderation)
app.delete("/api/admin/reports/:id/remove-recipe", verifyJWT, verifyAdmin, async (req, res) => {
  const { id } = req.params; // This is the report ID
  try {
    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Delete the recipe
    await Recipe.findByIdAndDelete(report.recipeId);
    
    // Resolve all reports matching this recipe
    await Report.updateMany({ recipeId: report.recipeId }, { $set: { status: "resolved" } });
    // Also clean up favorites
    await Favorite.deleteMany({ recipeId: report.recipeId });

    return res.json({ success: true, message: "Recipe and reports deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to resolve report and delete recipe", error: error.message });
  }
});

// Dismiss report
app.put("/api/admin/reports/:id/dismiss", verifyJWT, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const report = await Report.findByIdAndUpdate(id, { $set: { status: "dismissed" } }, { new: true });
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }
    return res.json({ success: true, message: "Report has been dismissed.", report });
  } catch (error) {
    return res.status(500).json({ message: "Failed to dismiss report", error: error.message });
  }
});

// List all transactions (Payments history)
app.get("/api/admin/transactions", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const transactions = await Payment.find()
      .populate("recipeId")
      .sort({ paidAt: -1 });
    return res.json(transactions);
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve transaction log", error: error.message });
  }
});

// ==========================================
// STARTUP AND ERROR HANDLING
// ==========================================

const server = app.listen(PORT, () => {
  console.log(`RecipeHub Server is running on port ${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
    process.exit(1);
  }
  console.error("Server startup error:", error);
  process.exit(1);
});

export default app;

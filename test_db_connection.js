import mongoose from "./db.js";
import Recipe from "./models/Recipe.js";
import User from "./models/User.js";

async function runDiagnostics() {
  try {
    console.log("Mongoose state:", mongoose.connection.readyState);
    const usersCount = await User.countDocuments();
    const recipesCount = await Recipe.countDocuments();

    console.log("--- RecipeHub Database Diagnostics ---");
    console.log(`Connection state: Connected (${mongoose.connection.host})`);
    console.log(`Total Users in DB: ${usersCount}`);
    console.log(`Total Recipes in DB: ${recipesCount}`);
    
    if (recipesCount > 0) {
      const sample = await Recipe.findOne();
      console.log(`Sample recipe name: "${sample.recipeName}" by ${sample.authorName}`);
    }
    
    console.log("--------------------------------------");
  } catch (err) {
    console.error("Diagnostic error:", err);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
    process.exit(0);
  }
}

// Wait for mongoose to open its connection
if (mongoose.connection.readyState === 1) {
  runDiagnostics();
} else {
  mongoose.connection.once("open", runDiagnostics);
}

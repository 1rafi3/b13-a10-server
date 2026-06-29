import mongoose from "mongoose";

const RecipeSchema = new mongoose.Schema(
  {
    recipeName: {
      type: String,
      required: true,
    },
    recipeImage: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    cuisineType: {
      type: String,
      required: true,
    },
    difficultyLevel: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },
    preparationTime: {
      type: Number,
      required: true, // in minutes
    },
    ingredients: {
      type: [String],
      required: true,
    },
    instructions: {
      type: [String],
      required: true,
    },
    authorId: {
      type: String, // Better Auth user ID is string
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorEmail: {
      type: String,
      required: true,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "pending", "disabled"],
      default: "active",
    },
    price: {
      type: Number,
      default: 0, // 0 means free, >0 means paid recipe
    },
  },
  {
    collection: "recipes",
    timestamps: true,
  }
);

const Recipe = mongoose.models.Recipe || mongoose.model("Recipe", RecipeSchema);
export default Recipe;

import mongoose from "mongoose";

const FavoriteSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    recipeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "favorites",
  }
);

const Favorite = mongoose.models.Favorite || mongoose.model("Favorite", FavoriteSchema);
export default Favorite;

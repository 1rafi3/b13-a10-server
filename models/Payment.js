import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    recipeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
      default: null, // Null if payment is for premium membership
    },
    isMembership: {
      type: Boolean,
      default: false, // True if payment is for premium membership upgrade
    },
    transactionId: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["succeeded", "pending", "failed"],
      default: "succeeded",
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "payments",
  }
);

const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
export default Payment;

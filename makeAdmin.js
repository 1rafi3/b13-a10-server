import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const makeAdmin = async (email) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const user = await User.findOneAndUpdate(
      { email: email },
      { $set: { role: "admin", isPremium: true } },
      { new: true }
    );

    if (user) {
      console.log(`Successfully made ${email} an admin!`);
      console.log(user);
    } else {
      console.log(`User with email ${email} not found in the database.`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from DB");
  }
};

const targetEmail = process.argv[2] || "ichigokurasaki1800@gmail.com";
makeAdmin(targetEmail);

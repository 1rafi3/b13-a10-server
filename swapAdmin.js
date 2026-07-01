import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const swapAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    // 1. Remove admin rights from ichigo
    const oldAdmin = await User.findOneAndUpdate(
      { email: "ichigokurasaki1800@gmail.com" },
      { $set: { role: "user" } },
      { new: true }
    );
    if (oldAdmin) {
      console.log("Removed admin access from ichigokurasaki1800@gmail.com");
    }

    const newEmail = "admin@gmail.com";
    const newPassword = "abcdefgh";

    // 2. Try to make admin@gmail.com an admin in DB
    let newAdmin = await User.findOne({ email: newEmail });
    
    if (newAdmin) {
      newAdmin.role = "admin";
      newAdmin.isPremium = true;
      await newAdmin.save();
      console.log(`Successfully made ${newEmail} an admin!`);
    } else {
      console.log(`User ${newEmail} not found. Registering via API...`);
      
      // Register via API so Better Auth hashes the password
      const res = await fetch("https://a10server-ashy.vercel.app/api/auth/sign-up/email", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Origin": "https://a10client.vercel.app"
        },
        body: JSON.stringify({
          name: "Admin User",
          email: newEmail,
          password: newPassword
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        console.log("Successfully registered admin@gmail.com!");
        // Now update the role in DB
        await User.findOneAndUpdate(
          { email: newEmail },
          { $set: { role: "admin", isPremium: true } }
        );
        console.log(`Made ${newEmail} an admin!`);
      } else {
        console.log("Registration failed:", data);
        // If it says "User already exists", then maybe they exist in auth but not our DB model?
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from DB");
  }
};

swapAdmin();

const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const adminEmail = "admin@taskmask.com";
    const adminPassword = "TaskMaskAdmin2026!";

    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      console.log(`Admin user already exists: ${admin.email}`);
    } else {
      admin = await User.create({
        name: "Administrator",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
      });
      console.log(`Admin user created: ${admin.email} (role: ${admin.role})`);
    }

    // Also seed a standard user for contrast/testing
    const userEmail = "user@taskmask.com";
    const userPassword = "TaskMaskUser2026!";

    let user = await User.findOne({ email: userEmail });

    if (user) {
      console.log(`Standard user already exists: ${user.email}`);
    } else {
      user = await User.create({
        name: "Team Member",
        email: userEmail,
        password: userPassword,
        role: "user",
      });
      console.log(`Standard user created: ${user.email} (role: ${user.role})`);
    }

    console.log("Seed complete.");
    process.exit(0);
  } catch (error) {
    console.error(`Seed error: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();

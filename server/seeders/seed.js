const mongoose = require("mongoose");
require("dotenv").config();

const { seedDemo } = require("./seedDemo");

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await seedDemo({ log: console.log });

    console.log("");
    console.log("Sample logins");
    console.log("-------------");
    console.log("Admin  : admin@taskmask.com / TaskMaskAdmin2026!");
    console.log("Member : user@taskmask.com  / TaskMaskUser2026!");
    console.log("Teammate: priya@taskmask.com / TaskMask2026!");
    console.log("Teammate: marcus@taskmask.com / TaskMask2026!");

    process.exit(0);
  } catch (error) {
    console.error(`Seed error: ${error.message}`);
    process.exit(1);
  }
};

run();

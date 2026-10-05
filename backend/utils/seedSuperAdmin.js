require("dotenv").config();

const connectDB = require("../config/db");
const User = require("../models/User");

const seedSuperAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({
      role: "SUPER_ADMIN",
    });

    if (existingAdmin) {
      console.log("Super Admin already exists");
      process.exit(0);
    }

    const admin = await User.create({
      name: process.env.SUPER_ADMIN_NAME,
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
      role: "SUPER_ADMIN",
      organizationId: null,
    });

    console.log("Super Admin created successfully");
    console.log("Email:", admin.email);

    process.exit(0);
  } catch (error) {
    console.error("Error creating Super Admin:", error);
    process.exit(1);
  }
};

seedSuperAdmin();
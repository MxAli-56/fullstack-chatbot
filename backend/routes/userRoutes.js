//userRoutes.js

const express = require("express")
const User = require("../models/User")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const authMiddleware = require("../middleware/authMiddleware")

const router = express.Router()

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save(); // ✅ important

    return res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post("/login", async (req,res) => {
    try {
        const {email, password} = req.body

        const findUser = await User.findOne({email})
        if (!findUser){
            return res.status(404).json({message: "User not found"})
        }

        const matchPassword = await bcrypt.compare(password, findUser.password)
        if (!matchPassword){
            return res.status(401).json({message: "Invalid credentials"})
        }

        const token = jwt.sign(
            {id: findUser.id},
            process.env.JWT_Secret,
            {expiresIn: "1h"}
        )

        return res.json({
          message: "login successful",
          token,
          user: {
            name: findUser.name, // ← This is what's missing!
            email: findUser.email,
          },
        });
    } catch (error) {
        return res.status(500).json({message: "Something went wrong"})
    }
})

router.post("/logout", authMiddleware, async(req, res) => {
    try {
       return res.status(200).json({message: "Logged out successfully"})
    } catch (error) {
        return res.status(500).json({error: error.message})
    }
})

// GET /api/users → return all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

router.get("/me", authMiddleware, async(req,res) => {
    try {
      const loginuser = await User.findById(req.loginuser.id).select("-password");
      if (!loginuser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(loginuser)
    } catch (error) {
        return res.status(500).json({message: "Error fetching user info"})
    }
})

// Add this to your user routes or auth routes
router.get("/current-user", authMiddleware, async (req, res) => {
  try {
    // Assuming you have a User model
    const user = await User.findById(req.user.id).select("name");
    res.json({ name: user.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router
const express = require("express");
const Razorpay = require("razorpay");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL Database Setup
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "System123#",
    database: "payments_db",
});

db.connect((err) => {
    if (err) throw err;
    console.log("Database connected!");
});

// Razorpay Instance
const razorpay = new Razorpay({
    
key_id: "rzp_test_O8eFprYjeNYF7l",
key_secret: "7SW4wz0NW8ljVYsDaowDX2Yz",
});

// User Registration Endpoint
app.post("/signup", async (req, res) => {
    const { email, password } = req.body;

    // Check if the user already exists
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.length > 0) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash the password before saving to the database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user to the database
        const sql = "INSERT INTO users (email, password) VALUES (?, ?)";
        db.query(sql, [email, hashedPassword], (err, result) => {
            if (err) return res.status(500).json({ error: err });
            res.json({ message: "User registered successfully" });
        });
    });
});

// User Login Endpoint
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    // Find the user in the database
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.length === 0) {
            return res.status(400).json({ message: "User not found" });
        }

        const user = results[0];

        // Compare the password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Create a JWT token
        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.json({ message: "Login successful", token });
    });
});

// Create Order Endpoint
app.post("/create-order", (req, res) => {
    const { amount, currency } = req.body;

    const options = {
        amount: amount * 100, // Amount in smallest currency unit (paise for INR)
        currency: currency,
        receipt: `receipt_${Date.now()}`,
    };

    razorpay.orders.create(options, (err, order) => {
        if (err) return res.status(500).json({ error: err });
        res.json(order);
    });
});

// Save Payment Info and Verify Signature
app.post("/save-payment", (req, res) => {
    const { orderId, paymentId, signature } = req.body;

    // Verify the payment signature
    const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(orderId + "|" + paymentId)
        .digest("hex");

    if (generatedSignature !== signature) {
        return res.status(400).json({ error: "Payment signature mismatch" });
    }

    // Insert payment info into the database if the signature is valid
    const sql = "INSERT INTO payments (order_id, payment_id, signature) VALUES (?, ?, ?)";
    db.query(sql, [orderId, paymentId, signature], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Payment saved successfully!" });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

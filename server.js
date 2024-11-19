const express = require("express");
const Razorpay = require("razorpay");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const cors = require("cors");

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

// Save Payment Info
app.post("/save-payment", (req, res) => {
    const { orderId, paymentId, signature } = req.body;

    const sql = "INSERT INTO payments (order_id, payment_id, signature) VALUES (?, ?, ?)";
    db.query(sql, [orderId, paymentId, signature], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Payment saved successfully!" });
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

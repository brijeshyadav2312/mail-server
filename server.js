require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();

/* -------------------- MIDDLEWARE -------------------- */

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["POST"],
}));

app.use(express.json());

// Rate limit (5 requests / 10 minutes)
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: "Too many requests, try again later"
});
app.use("/send-mail", limiter);

/* -------------------- SMTP CONFIG -------------------- */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

/* -------------------- UTIL FUNCTIONS -------------------- */

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/* -------------------- ROUTES -------------------- */

app.post("/send-mail", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    /* ---- VALIDATIONS ---- */
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        msg: "Name, email and message are required"
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid email format"
      });
    }

    if (phone && phone.length < 10) {
      return res.status(400).json({
        success: false,
        msg: "Phone number must be at least 10 digits"
      });
    }

    if (message.length < 16) {
      return res.status(400).json({
        success: false,
        msg: "Message must be at least 16 characters"
      });
    }

    /* ---- EMAIL TEMPLATE ---- */
    const mailOptions = {
      from: `"Portfolio Contact" <${process.env.EMAIL}>`,
      to: process.env.EMAIL,
      subject: "New Contact Message",
      html: `
        <div style="font-family:Arial">
          <h2>New Contact Message</h2>
          <hr/>
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Phone:</b> ${phone || "N/A"}</p>
          <p><b>Message:</b></p>
          <p>${message}</p>
        </div>
      `
    };

    /* ---- SEND MAIL ---- */
    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      msg: "Mail sent successfully"
    });

  } catch (error) {
    console.error("Mail error:", error);

    res.status(500).json({
      success: false,
      msg: "Server error, try again later"
    });
  }
});

/* -------------------- SERVER -------------------- */

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();

/* -------------------- MIDDLEWARE -------------------- */

// Body parser
app.use(express.json());

// CORS (temporary allow all for debugging)
app.use(cors({
  origin: "*",   // after working, replace with Netlify URL
  methods: ["POST","GET","OPTIONS"],
}));

app.options("*", cors()); // preflight fix

// Rate limit (5 req / 10 min)
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    success:false,
    msg:"Too many requests. Try again later."
  }
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

// Verify transporter on startup
transporter.verify((err, success) => {
  if (err) {
    console.log("❌ Mail server error:", err);
  } else {
    console.log("✅ Mail server ready");
  }
});

/* -------------------- UTIL -------------------- */

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/* -------------------- ROUTES -------------------- */

// Health check
app.get("/", (req,res)=>{
  res.send("Mail API running 🚀");
});

app.post("/send-mail", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    /* VALIDATIONS */
    if (!name || !email || !message) {
      return res.status(400).json({
        success:false,
        msg:"Name, email & message are required"
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success:false,
        msg:"Invalid email format"
      });
    }

    if (phone && phone.length < 10) {
      return res.status(400).json({
        success:false,
        msg:"Phone must be at least 10 digits"
      });
    }

    if (message.length < 16) {
      return res.status(400).json({
        success:false,
        msg:"Message must be 16 characters minimum"
      });
    }

    /* EMAIL TEMPLATE */
    const mailOptions = {
      from: `"Portfolio" <${process.env.EMAIL}>`,
      to: process.env.EMAIL,
      replyTo: email,
      subject: "New Contact Message",
      html: `
        <div style="font-family:Arial">
          <h2>New Message</h2>
          <hr/>
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Phone:</b> ${phone || "N/A"}</p>
          <p><b>Message:</b></p>
          <p>${message}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success:true,
      msg:"Mail sent successfully"
    });

  } catch (error) {
    console.error("MAIL ERROR:", error);

    res.status(500).json({
      success:false,
      msg:"Internal server error"
    });
  }
});

/* -------------------- SERVER -------------------- */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

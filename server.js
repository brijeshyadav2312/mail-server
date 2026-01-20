require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();

/* TRUST PROXY (Render) */
app.set("trust proxy", 1);

/* MIDDLEWARE */
app.use(express.json({ limit: "10kb" }));

app.use(cors({
  origin: "*",   // replace with Netlify URL later
  methods: ["POST","GET"],
}));

/* RATE LIMIT */
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success:false,
    msg:"Too many requests. Try again later."
  }
});
app.use("/send-mail", limiter);

/* SMTP */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,
  socketTimeout: 10000,
});

/* VERIFY MAIL SERVER */
transporter.verify((err) => {
  if (err) console.log("❌ Mail error:", err);
  else console.log("✅ Mail server ready");
});

/* UTIL */
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/* ROUTES */

// Health check
app.get("/", (req,res)=>{
  res.send("Mail API running 🚀");
});

// Send mail
app.post("/send-mail", async (req,res)=>{
  try{
    const {name,email,phone,message} = req.body;

    if(!name || !email || !message){
      return res.status(400).json({
        success:false,
        msg:"Name, email & message required"
      });
    }

    if(!isValidEmail(email)){
      return res.status(400).json({
        success:false,
        msg:"Invalid email"
      });
    }

    if(phone && phone.length < 10){
      return res.status(400).json({
        success:false,
        msg:"Phone must be 10 digits"
      });
    }

    if(message.length < 16){
      return res.status(400).json({
        success:false,
        msg:"Message min 16 characters"
      });
    }

    const mailOptions = {
      from: `"Portfolio" <${process.env.EMAIL}>`,
      to: process.env.EMAIL,
      replyTo: email,
      subject: "New Contact Message",
      html: `
        <h3>New Message</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone || "N/A"}</p>
        <p><b>Message:</b></p>
        <p>${message}</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success:true,
      msg:"Mail sent successfully"
    });

  }catch(err){
    console.log("MAIL ERROR:", err);
    res.status(500).json({
      success:false,
      msg:"Server error"
    });
  }
});

/* GLOBAL ERROR HANDLER */
process.on("unhandledRejection",(err)=>{
  console.log("Unhandled:", err);
});

/* SERVER */
const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>{
  console.log(`🚀 Server running on ${PORT}`);
});

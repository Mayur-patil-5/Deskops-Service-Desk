import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRoutes from "./Routes/health.routes.js";
import authRoutes from "./Auth/auth.routes.js";
import generalLimiter from "./Middlewares/rateLimit.middleware.js";
import helmet from "helmet";

dotenv.config();

const app = express();
// Security HTTP headers
app.use(helmet());

app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
app.use(express.json());

// Apply rate limiting to all API routes
app.use("/api/v1", generalLimiter);

// Test API
app.get("/", (req, res) => {
    res.send("DeskOps Backend is running!");
});

app.use("/api/v1", healthRoutes);
app.use("/api/v1/auth", authRoutes);


const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`DeskOps server running on port ${PORT}`);
});
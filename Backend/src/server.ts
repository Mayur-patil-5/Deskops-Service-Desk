import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRoutes from "./Routes/health.routes.js";
import authRoutes from "./Auth/auth.routes.js";
import generalLimiter from "./Middlewares/rateLimit.middleware.js";
import helmet from "helmet";
import ticketRoutes from "./Routes/ticket.routes.js";
import assignmentRoutes from "./Routes/assignment.routes.js";

dotenv.config();

const app = express();

app.use(helmet());

app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.use(express.json());

app.use("/api/v1", generalLimiter);

app.get("/", (req, res) => {
    res.send("DeskOps Backend is running!");
});

app.use("/api/v1", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/tickets", ticketRoutes);
app.use("/api/v1/assignments", assignmentRoutes);

export default app;
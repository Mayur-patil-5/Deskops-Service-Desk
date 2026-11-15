import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRoutes from "./Routes/health.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Test API
app.get("/", (req, res) => {
    res.send("DeskOps Backend is running!");
});

app.use("/api/v1", healthRoutes);


const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`DeskOps server running on port ${PORT}`);
});
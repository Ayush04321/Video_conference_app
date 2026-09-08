import express from "express";
import {createServer} from "node:http";
import {Server} from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import connectToSocket from "./controllers/socketManager.js";
import userRoutes from "./routes/userRoutes.js";
const app=express();
const server=createServer(app);
const io=connectToSocket(server);

app.set("port",(process.env.PORT||8000));
app.use(cors());
app.use(express.json({limit:"40kb"}));
app.use(express.urlencoded({limit:"40kb", extended:"true"}));
app.use("/api/v1/users", userRoutes);

// const start = async () => {
//   const connectionDb = await mongoose.connect(
//     "mongodb+srv://0808ci231053ies_db_user:AyushZoom@cluster0.mlwfa10.mongodb.net/zoom_db?retryWrites=true&w=majority&appName=Cluster0"
//   );
//   console.log(`db connected to: ${connectionDb.connection.name}`);
//   server.listen(app.get("port"), () => {
//     console.log("listening on 8000");
//   });
// };

const start = async () => {
    try {
        const connectionDb = await mongoose.connect("mongodb+srv://0808ci231053ies_db_user:AyushZoom@cluster0.mlwfa10.mongodb.net/zoom_db?retryWrites=true&w=majority&appName=Cluster0");
        console.log(`✅ DB Connected to: ${connectionDb.connection.name}`);

        server.listen(app.get("port"), () => {
            console.log(`🚀 Server listening on port ${app.get("port")}`);
        });
    } catch (err) {
        console.log("❌ DB Connection Error:", err.message);
    }
};

start();
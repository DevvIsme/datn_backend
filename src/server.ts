import express from "express";
import path from "path";
import cors from "cors";
import routes from "./routes/index.route";

import env from "./configurations/environment";
import { responseFormatter } from "./middlewares/formatResponse";
import { authenticateDatabase, syncDatabase } from "./configurations/database";
import { redisConnection } from "./configurations/redis.connection";

const app = express();
const port = env.port;

app.disable('etag');
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.static(path.join(__dirname, "../uploads")));
app.use("/public", express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/files", express.static(path.join(__dirname, "../uploads/lessons")));
app.use(  "/violations",
  express.static(path.join(__dirname, "../uploads/violations"))
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));


app.use(responseFormatter);
routes(app);

const startServer = async () => {
  try {
    await authenticateDatabase();
    await syncDatabase();
    // await redisConnection();
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start the server:", err);
  }
};

startServer();

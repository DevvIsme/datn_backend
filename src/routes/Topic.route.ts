import express, { Router } from "express";
import * as Topic from "../controllers/Topic.controller";
import { verifySupadmin } from "../middlewares/authentication";

const router: Router = express.Router();

router.get("/list/", Topic.GetListTopic);
router.get("/:slug", Topic.DetailTopic);

router.post("/create/", verifySupadmin, Topic.CreateTopic);
router.put("/update/:id", verifySupadmin, Topic.UpdateTopic);
router.delete("/delete/:id", verifySupadmin, Topic.DeleteTopic);

export default router;

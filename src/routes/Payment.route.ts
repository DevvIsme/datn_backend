import express, { Router } from "express";
import {
  verifyAccessToken,
} from "../middlewares/authentication";
import * as Payment from "../controllers/Payment.controller";

const router: Router = express.Router();


router.post("/create-url", verifyAccessToken, Payment.CreatePaymentUrl);
router.post("/check-status", verifyAccessToken, Payment.CheckPaymentStatus);

export default router;

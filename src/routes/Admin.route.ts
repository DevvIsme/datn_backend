import express, { Router } from "express";
import * as Admin from "../controllers/Admin.controller";
import { verifySupadmin, verifyAdmin } from "../middlewares/authentication";

const router: Router = express.Router();

router.get("/list/", verifySupadmin, Admin.GetListAdmin);
router.post("/create/", verifySupadmin, Admin.CreateAdmin);
router.put("/update-status/:id", verifySupadmin, Admin.UpdateStatus);
router.put("/update-permission/:id", verifySupadmin, Admin.UpdatePermission);
router.delete("/delete/:id", verifySupadmin, Admin.DeleteAdmin);

router.get("/my-info/", verifyAdmin, Admin.MyInfo);
router.put("/my-info/update", verifyAdmin, Admin.UpdateMyInfo);
router.put("/my-info/change-password", verifyAdmin, Admin.ChangePassword);

router.post("/forgot-password/", Admin.ForgotPassword);
router.post("/forgot-password/:reset/", Admin.ResetPassword);
router.get("/forgot-password/:reset/", Admin.VerifyResetstring);
router.put("/update-role/:id", verifySupadmin, Admin.UpdateRole);

export default router;

import express, { Router } from "express";
import * as Student from "../controllers/Student.controller";
import {
  verifyCanStudent,
  verifyStudent,
  verifyAdmin,
} from "../middlewares/authentication";

const router: Router = express.Router();

router.post("/forgot_password/", Student.ForgotPassword);
router.post("/forgot_password/:id/", Student.ResetPassword);
router.get("/forgot_password/:reset/", Student.VerifyResetstring);

router.get("/list/", verifyAdmin, Student.GetListStudent);
router.get("/detail/:id", verifyCanStudent, Student.DetailInfo);
router.post("/create/", verifyCanStudent, Student.CreateStudent);
router.post("/create/bulk/", verifyCanStudent, Student.CreateStudentBulk);
router.put(
  "/change_status/:student_id",
  verifyCanStudent,
  Student.ChangeStatus
);
router.delete("/delete/:student_id", verifyCanStudent, Student.DeleteStudent);

router.get("/my_info", verifyStudent, Student.MyInfo);
router.put("/my_info/update/", verifyStudent, Student.UpdateMyAcc);
router.put("/my_info/change_password/", verifyStudent, Student.ChangePassword);
router.put("/update/:student_id", verifyAdmin, Student.UpdateStudent);

export default router;

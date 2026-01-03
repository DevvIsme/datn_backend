import { Router, Express } from "express";
import AuthRoute from "./Auth.route";
import AdminRoute from "./Admin.route";
import StudentRoute from "./Student.route";
import TopicRoute from "./Topic.route";
import CourseRoute from "./Course.route";
import MaterialRoute from "./Material.route";
import SurveyRoute from "./Survey.route";
import ExamRoute from "./Exam.route";
import LessonRoute from "./Lessons.route";
import PaymentRoute from "./Payment.route";
import DashboardRoute from "./Dashboard.route";

const router: Router = Router();

const routes = (app: Express) => {
  router.use("/auth", AuthRoute);
  router.use("/admin", AdminRoute);
  router.use("/student", StudentRoute);
  router.use("/topic", TopicRoute);
  router.use("/course", CourseRoute);
  router.use("/material", MaterialRoute);
  router.use("/survey", SurveyRoute);
  router.use("/exam", ExamRoute);
  router.use("/lesson", LessonRoute);
  router.use("/payment", PaymentRoute);
  app.use("/api/dashboard", DashboardRoute);
  app.use("/api", router);
};

export default routes;
import Admin from "../models/Admin.model";

export const coursePermission = async (id: number) => {
  const admin = await Admin.findByPk(id);
  return admin?.course_permission;
};

export const studentPermission = async (id: number) => {
  const admin = await Admin.findByPk(id);
  return admin?.student_permission;
};

export const examPermission = async (id: number) => {
  const admin = await Admin.findByPk(id);
  return admin?.student_permission;
};

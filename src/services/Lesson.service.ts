import { Op } from "sequelize";
import Lesson from "../models/Lesson.Model";

export const AddLessonContinue = async (
  name: string,
  description: string,
  context: string,
  course_id: number
) => {
  const maxOrderNumber =
    ((await Lesson.max("inCourse", {
      where: { course_id },
    })) as number) || 0;
  const newLesson = await Lesson.create({
    name,
    description,
    context,
    course_id,
    inCourse: maxOrderNumber + 1,
  });
  return newLesson;
};

export const InsertLesson = async (
  name: string,
  description: string,
  context: string,
  course_id: number,
  insertPosition: number
) => {
  if (insertPosition < 1) {
    insertPosition = 1;
  }
  const maxOrderNumber =
    ((await Lesson.max("inCourse", {
      where: { course_id },
    })) as number) || 0;
  if (insertPosition > maxOrderNumber) {
    await AddLessonContinue(name, description, context, course_id);
    return;
  }
  await Lesson.increment("inCourse", {
    by: 1,
    where: {
      course_id,
      inCourse: {
        [Op.gte]: insertPosition,
      },
    },
  });
  const newLesson = await Lesson.create({
    name,
    description,
    context,
    course_id,
    inCourse: insertPosition,
  });
  return newLesson;
};

// export const UpdateLessonOrder = async (
//   currentLesson: Lesson,
//   newOrder: number
// ) => {
//   const currentOrder = currentLesson.inCourse;
//   const course_id = currentLesson.course_id;

//   if (currentOrder == newOrder) {
//     return currentLesson;
//   }
//   const maxOrderNumber =
//     ((await Lesson.max("inCourse", {
//       where: { course_id },
//     })) as number) || 0;

//   if (currentOrder > newOrder) {
//     await Lesson.increment("inCourse", {
//       by: 1,
//       where: {
//         course_id,
//         inCourse: {
//           [Op.gte]: newOrder,
//           [Op.lt]: currentOrder,
//         },
//       },
//     });
//   } else {
//     if (newOrder > maxOrderNumber) {
//       newOrder = maxOrderNumber;
//     }
//     await Lesson.increment("inCourse", {
//       by: -1,
//       where: {
//         course_id,
//         inCourse: {
//           [Op.gt]: currentOrder,
//           [Op.lte]: newOrder,
//         },
//       },
//     });
//   }
//   currentLesson.inCourse = newOrder;
//   await currentLesson.save();
//   return currentLesson;
// };

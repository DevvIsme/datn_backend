import Survey from "../models/Survey.Model";
import SurveyQuestion from "../models/SurveyQuestion.Model";
import { convertString } from "../helpers/convertToSlug";



export const addQuestion = async (
  list_question: string[],
  survey_id: number
) => {
  const questions = list_question.map((question: any) => ({
    survey_id: survey_id,
    name: question,
  }));

  await SurveyQuestion.bulkCreate(questions);
  return questions;
};


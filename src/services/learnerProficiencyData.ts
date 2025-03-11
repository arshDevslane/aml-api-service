import { Optional, Op, QueryTypes } from 'sequelize';
import { LearnerProficiencyQuestionLevelData } from '../models/learnerProficiencyQuestionLevelData';
import { LearnerProficiencyAggregateData } from '../models/learnerProficiencyAggregateData';
import { LearnerProficiencyQuestionSetLevelData } from '../models/learnerProficiencyQuestionSetLevelData';

export const getQuestionLevelDataByLearnerIdQuestionIdAndQuestionSetId = async (learnerId: string, questionId: string, questionSetId: string): Promise<LearnerProficiencyQuestionLevelData | null> => {
  return LearnerProficiencyQuestionLevelData.findOne({
    where: { learner_id: learnerId, question_id: questionId, question_set_id: questionSetId },
    order: [['attempt_number', 'desc']],
    raw: true,
  });
};

export const getQuestionLevelDataByLearnerIdQuestionIdQuestionSetIdAndAttemptNumber = async (
  learnerId: string,
  questionId: string,
  questionSetId: string,
  attempt_number: number,
): Promise<LearnerProficiencyQuestionLevelData | null> => {
  return LearnerProficiencyQuestionLevelData.findOne({
    where: { learner_id: learnerId, question_id: questionId, question_set_id: questionSetId, attempt_number },
    order: [['attempt_number', 'desc']],
    raw: true,
  });
};

export const bulkReadLearnerProficiencyData = async (data: { learnerId: string; questionId: string; questionSetId: string; attemptNumber: number }[]) => {
  const queryData = data.map((datum) => ({
    learner_id: datum.learnerId,
    question_id: datum.questionId,
    question_set_id: datum.questionSetId,
    attempt_number: datum.attemptNumber,
  }));
  const whereClause: any = {
    [Op.or]: queryData,
  };

  // Fetching records
  return LearnerProficiencyQuestionLevelData.findAll({
    where: whereClause,
    attributes: ['id', 'identifier', 'learner_id', 'question_id', 'question_set_id', 'attempt_number', 'taxonomy'], // Select only required fields
    order: [['attempt_number', 'DESC']], // Order by attempt_number
    raw: true,
  });
};

export const createLearnerProficiencyQuestionLevelData = async (transaction: any, req: Optional<any, string> | undefined): Promise<LearnerProficiencyQuestionLevelData> => {
  return LearnerProficiencyQuestionLevelData.create(req, { transaction });
};

export const bulkCreateLearnerProficiencyQuestionLevelData = async (transaction: any, req: Optional<any, string>[]): Promise<LearnerProficiencyQuestionLevelData[]> => {
  return LearnerProficiencyQuestionLevelData.bulkCreate(req, { transaction });
};

// export const updateLearnerProficiencyQuestionLevelData = async (transaction: any, identifier: string, req: any): Promise<any> => {
//   const whereClause: Record<string, any> = { identifier };
//   const updatedLearnerData = await LearnerProficiencyQuestionLevelData.update(req, {
//     where: whereClause,
//     transaction,
//   });
//   return { updatedLearnerData };
// };

export const updateLearnerProficiencyQuestionLevelData = async (transaction: any, data: { identifier: string; [key: string]: any } | { identifier: string; [key: string]: any }[]): Promise<any> => {
  if (Array.isArray(data)) {
    const values = data
      .map(
        (item) =>
          `'${item.identifier}', ` + `'${JSON.stringify(item.learner_response)}'::jsonb, ` + `'${JSON.stringify(item.sub_skills)}'::jsonb, ` + `${item.score}, ` + `'${item.updated_by}', ` + `NOW()`,
      )
      .join(', ');

    const query = `
      WITH updated_values (identifier, learner_response, sub_skills, score, updated_by, updated_at) AS (
        VALUES (${values})
      )
      UPDATE learner_proficiency_question_level_data AS t 
      SET
        learner_response = uv.learner_response,
        sub_skills = uv.sub_skills,
        score = uv.score,
        updated_by = uv.updated_by,
        updated_at = uv.updated_at
      FROM updated_values uv
      WHERE t.identifier = uv.identifier
    `;

    return LearnerProficiencyQuestionLevelData.sequelize?.query(query, {
      transaction,
      type: QueryTypes.UPDATE,
    });
  }
  // Single update (maintaining backward compatibility)
  const { identifier, ...updateData } = data;
  return LearnerProficiencyQuestionLevelData.update(updateData, {
    where: { identifier },
    transaction,
  });
};

export const readLearnerAggregateData = async (learnerId: string): Promise<{ learnerAggregateData: LearnerProficiencyAggregateData[] }> => {
  const learnerAggregateData = await LearnerProficiencyAggregateData.findAll({
    where: { learner_id: learnerId },
    order: [['updated_at', 'desc']],
    attributes: { exclude: ['id'] },
    raw: true,
  });

  return { learnerAggregateData };
};

export const getRecordsForLearnerByQuestionSetId = async (learnerId: string, questionSetId: string, attempt_number: number): Promise<LearnerProficiencyQuestionLevelData[]> => {
  return LearnerProficiencyQuestionLevelData.findAll({
    where: { learner_id: learnerId, question_set_id: questionSetId, attempt_number },
    raw: true,
  });
};

export const getQuestionLevelDataRecordsForLearner = async (learnerId: string): Promise<LearnerProficiencyQuestionLevelData[]> => {
  return LearnerProficiencyQuestionLevelData.findAll({
    where: { learner_id: learnerId },
    raw: true,
  });
};

export const getQuestionSetLevelDataByLearnerIdAndQuestionSetId = async (learnerId: string, questionSetId: string): Promise<LearnerProficiencyQuestionSetLevelData | null> => {
  return LearnerProficiencyQuestionSetLevelData.findOne({
    where: { learner_id: learnerId, question_set_id: questionSetId },
    attributes: { exclude: ['id'] },
    raw: true,
  });
};

export const createLearnerProficiencyQuestionSetLevelData = async (transaction: any, req: Optional<any, string> | undefined): Promise<LearnerProficiencyQuestionSetLevelData> => {
  return LearnerProficiencyQuestionSetLevelData.create(req, { transaction });
};

export const updateLearnerProficiencyQuestionSetLevelData = async (transaction: any, identifier: string, req: any): Promise<any> => {
  const whereClause: Record<string, any> = { identifier };
  const updatedLearnerData = await LearnerProficiencyQuestionSetLevelData.update(req, {
    where: whereClause,
    transaction,
  });
  return { updatedLearnerData };
};

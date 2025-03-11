import { Op, QueryTypes } from 'sequelize';
import { LearnerProficiencyAggregateData } from '../models/learnerProficiencyAggregateData';

export const findAggregateData = async (filters: {
  learner_id?: string;
  class_id?: string;
  l1_skill_id?: string;
  l2_skill_id?: string;
  l3_skill_id?: string;
}): Promise<LearnerProficiencyAggregateData | null> => {
  return LearnerProficiencyAggregateData.findOne({
    where: { ...filters },
    attributes: { exclude: ['id'] },
    raw: true,
  });
};

export const bulkFindAggregateData = async (
  filterData: {
    learner_id?: string;
    class_id?: string;
    l1_skill_id?: string;
    l2_skill_id?: string;
    l3_skill_id?: string;
  }[],
) => {
  return LearnerProficiencyAggregateData.findAll({
    where: {
      [Op.or]: filterData,
    },
    attributes: { exclude: ['id'] },
    raw: true,
  });
};

export const createAggregateData = async (transaction: any, req: any): Promise<any> => {
  return LearnerProficiencyAggregateData.create(req, { transaction });
};

export const bulkCreateAggregateData = async (transaction: any, req: any): Promise<any> => {
  return LearnerProficiencyAggregateData.bulkCreate(req, { transaction });
};

export const updateAggregateData = async (transaction: any, data: { identifier: string; [key: string]: any } | { identifier: string; [key: string]: any }[]): Promise<any> => {
  if (Array.isArray(data)) {
    // Create the values string without any parentheses - they'll be added in the query
    const values = data
      .map((item) => `'${item.identifier}', ` + `${item.questions_count}, ` + `'${JSON.stringify(item.sub_skills)}'::jsonb, ` + `${item.score}, ` + `'${item.updated_by}', ` + `NOW()`)
      .join(', ');

    const query = `
      WITH updated_values (identifier, questions_count, sub_skills, score, updated_by, updated_at) AS (
        VALUES (${values})
      )
      UPDATE learner_proficiency_aggregate_data AS t 
      SET
        questions_count = uv.questions_count,
        sub_skills = uv.sub_skills,
        score = uv.score,
        updated_by = uv.updated_by,
        updated_at = uv.updated_at
      FROM updated_values uv
      WHERE t.identifier = uv.identifier
    `;

    return await LearnerProficiencyAggregateData.sequelize?.query(query, {
      transaction,
      type: QueryTypes.UPDATE,
    });
  }

  // Single update (maintaining backward compatibility)
  const { identifier, ...updateData } = data;
  return LearnerProficiencyAggregateData.update(updateData, {
    where: { identifier },
    transaction,
  });
};

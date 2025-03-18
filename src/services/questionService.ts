import { Op, Optional } from 'sequelize';
import * as _ from 'lodash';
import { Question } from '../models/question';
import { Status } from '../enums/status';
import { DEFAULT_LIMIT } from '../constants/constants';
import { Sequelize } from 'sequelize-typescript';
import { questionSetQuestionMappingService } from './questionSetQuestionMappingService';
import { cryptFactory } from './factories/cryptFactory';
import { redisService } from './integrations/redisService';

class QuestionService {
  private readonly REDIS_CONSTANTS = {
    QUESTIONS_LIST_MAP_KEY_PREFIX: 'questions_list_map_',
    QUESTION_ENT_KEY_PREFIX: 'question_ent',
  };

  private _getQuestionsByIdentifiersMapKey(hash: string) {
    return `${this.REDIS_CONSTANTS.QUESTIONS_LIST_MAP_KEY_PREFIX}${hash}`;
  }

  private _getQuestionEntKey(identifier: string) {
    return `${this.REDIS_CONSTANTS.QUESTION_ENT_KEY_PREFIX}:${identifier}`;
  }

  static getInstance() {
    return new QuestionService();
  }

  async createQuestionData(req: Optional<any, string>) {
    const question = await Question.create(req);
    await redisService.setEntity(this._getQuestionEntKey(question.identifier), question);
    return question;
  }

  async getQuestionById(id: string, additionalConditions: object = {}) {
    let question = await redisService.getObject<Question>(this._getQuestionEntKey(id));
    if (question) {
      return question;
    }

    // Combine base conditions with additional conditions
    const conditions = {
      identifier: id,
      ...additionalConditions, // Spread additional conditions here
    };

    question = await Question.findOne({
      where: conditions,
      attributes: { exclude: ['id'] },
      raw: true,
    });
    await redisService.setEntity(this._getQuestionEntKey(id), question);
    return question;
  }

  async updateQuestionData(questionIdentifier: string, updateData: any) {
    // Update the question in the database
    const question = await Question.update(updateData, {
      where: { identifier: questionIdentifier },
      returning: true,
    });
    await redisService.setEntity(this._getQuestionEntKey(questionIdentifier), question);
    return question;
  }

  async publishQuestionById(id: string, updatedBy: string) {
    const question = await Question.update({ status: Status.LIVE, updated_by: updatedBy }, { where: { identifier: id }, returning: true });
    await redisService.removeKey(this._getQuestionEntKey(id));
    return question;
  }

  async deleteQuestion(id: string) {
    const question = await Question.update({ is_active: false }, { where: { identifier: id }, returning: true });
    await redisService.removeKey(this._getQuestionEntKey(id));
    return question;
  }

  async discardQuestion(id: string) {
    const question = await Question.destroy({
      where: { identifier: id },
    });
    await redisService.removeKey(this._getQuestionEntKey(id));
    return question;
  }

  async getQuestionList(req: {
    filters: {
      is_active?: boolean;
      status?: Status;
      search_query?: string;
      repository_id?: string;
      question_type?: string[];
      question_set_id?: string;
      board_id?: string;
      class_id?: string;
      l1_skill_id?: string;
      l2_skill_id?: string;
      l3_skill_id?: string;
      sub_skill_id?: string;
    };
    limit?: number;
    offset?: number;
    sort_by?: string[][];
  }) {
    const limit: any = _.get(req, 'limit', DEFAULT_LIMIT);
    const offset: any = _.get(req, 'offset', 0);
    const { filters = {}, sort_by } = req || {};

    let whereClause: any = {
      is_active: true,
    };

    if (Object.prototype.hasOwnProperty.call(filters, 'is_active')) {
      whereClause = {
        ...whereClause,
        is_active: filters.is_active,
      };
    }

    if (filters.status) {
      whereClause = {
        ...whereClause,
        status: filters.status,
      };
    }

    if (filters.search_query) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          Sequelize.literal(`
    EXISTS (
      SELECT 1 
      FROM jsonb_each_text(name) AS kv
      WHERE LOWER(kv.value) LIKE '%${filters.search_query.toLowerCase()}%'
    )
  `),
          Sequelize.literal(`
    EXISTS (
      SELECT 1 
      FROM jsonb_each_text(description) AS kv
      WHERE LOWER(kv.value) LIKE '%${filters.search_query.toLowerCase()}%'
    )
  `),
          Sequelize.literal(`question_body->'numbers'->>'n1' LIKE '%${filters.search_query}%'`),
          Sequelize.literal(`question_body->'numbers'->>'n2' LIKE '%${filters.search_query}%'`),
          Sequelize.literal(`CONCAT(question_body->'numbers'->>'n1', ', ', question_body->'numbers'->>'n2') LIKE '%${filters.search_query}%'`),
          Sequelize.literal(`CONCAT(question_body->'numbers'->>'n1', ',', question_body->'numbers'->>'n2') LIKE '%${filters.search_query}%'`),
          Sequelize.literal(`
    EXISTS (
      SELECT 1 
      FROM jsonb_array_elements_text(question_body->'options') AS option
      WHERE option LIKE '%${filters.search_query}%'
    )
  `),
          Sequelize.literal(`
    (SELECT string_agg(option, ', ')
     FROM jsonb_array_elements_text(question_body->'options') AS option
    ) LIKE '%${filters.search_query}%'
  `),
          Sequelize.literal(`
    (SELECT string_agg(option, ',')
     FROM jsonb_array_elements_text(question_body->'options') AS option
    ) LIKE '%${filters.search_query}%'
  `),
          {
            x_id: {
              [Op.like]: `%${filters.search_query}%`,
            },
          },
        ],
      };
    }

    if (filters.repository_id) {
      whereClause = _.set(whereClause, ['repository', 'identifier'], filters.repository_id);
    }

    if (filters.question_type) {
      whereClause = _.set(whereClause, ['question_type'], filters.question_type);
    }

    if (filters.question_set_id) {
      const mappings = await questionSetQuestionMappingService.getEntriesForQuestionSetId(filters.question_set_id);
      const questionIds = mappings.map((mapping) => mapping.question_id);
      whereClause = _.set(whereClause, ['identifier'], questionIds);
    }

    if (filters.board_id) {
      whereClause = _.set(whereClause, ['taxonomy', 'board', 'identifier'], filters.board_id);
    }

    if (filters.class_id) {
      whereClause = _.set(whereClause, ['taxonomy', 'class', 'identifier'], filters.class_id);
    }

    if (filters.l1_skill_id) {
      whereClause = _.set(whereClause, ['taxonomy', 'l1_skill', 'identifier'], filters.l1_skill_id);
    }

    if (filters.l2_skill_id) {
      whereClause = {
        ...whereClause,
        taxonomy: {
          [Op.contains]: {
            l2_skill: [{ identifier: filters.l2_skill_id }],
          },
        },
      };
    }

    if (filters.l3_skill_id) {
      whereClause = {
        ...whereClause,
        taxonomy: {
          [Op.contains]: {
            l3_skill: [{ identifier: filters.l3_skill_id }],
          },
        },
      };
    }

    const order: any[] = [];
    if (sort_by && sort_by.length) {
      for (const sortOrder of sort_by) {
        const [column, direction] = sortOrder;
        switch (column) {
          case 'description': {
            order.push([Sequelize.literal(`description->>'en'`), direction]);
            break;
          }
          case 'repository': {
            order.push([Sequelize.literal(`repository->'name'->>'en'`), direction]);
            break;
          }
          default: {
            order.push([column, direction]);
          }
        }
      }
    }

    const { rows, count } = await Question.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      attributes: { exclude: ['id'] },
      raw: true,
      order: order.length ? order : [['updated_at', 'desc']],
    });

    return {
      questions: rows,
      meta: {
        offset,
        limit,
        total: count,
      },
    };
  }

  async getQuestionsByIdentifiers(identifiers: string[]) {
    const sortedIds = identifiers.sort();
    const hash = cryptFactory.md5(sortedIds.join(','));
    let questions = await redisService.getObject<Question[]>(this._getQuestionsByIdentifiersMapKey(hash));
    if (questions) {
      return questions;
    }
    questions = await Question.findAll({
      where: {
        identifier: {
          [Op.in]: identifiers,
        },
      },
      attributes: { exclude: ['id'] },
      raw: true,
    });
    await redisService.setEntity(this._getQuestionsByIdentifiersMapKey(hash), questions);
    return questions;
  }

  async checkQuestionsExist(questionIdentifiers: string[]): Promise<{ exists: boolean; foundQuestions?: any[] }> {
    const foundQuestions = await Question.findAll({
      where: {
        identifier: { [Op.in]: questionIdentifiers },
        is_active: true,
      },
      attributes: ['id', 'identifier'],
    });

    const foundQuestionsList = foundQuestions.map((question) => question.toJSON());

    // Check if all requested questions are found
    const exists = foundQuestions.length === questionIdentifiers.length;

    return { exists, foundQuestions: foundQuestionsList };
  }
}

export const questionService = QuestionService.getInstance();

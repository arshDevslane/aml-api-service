import { Op, Optional } from 'sequelize';
import { Status } from '../enums/status';
import { QuestionSet } from '../models/questionSet';
import _ from 'lodash';
import { QuestionSetPurposeType } from '../enums/questionSetPurposeType';
import { Sequelize } from 'sequelize-typescript';
import { DEFAULT_LIMIT } from '../constants/constants';
import { redisService } from './integrations/redisService';

class QuestionSetService {
  private readonly REDIS_CONSTANTS = {
    QUESTION_SET_ENT_KEY_PREFIX: 'question_set_ent',
    QUESTION_SET_LIST_MAP_PREFIX: 'question_set_list_map_',
  };

  private _getQuestionSetEntKey(identifier: string) {
    return `${this.REDIS_CONSTANTS.QUESTION_SET_ENT_KEY_PREFIX}:${identifier}`;
  }

  private _getQuestionSetListMapKey(hash: string) {
    return `${this.REDIS_CONSTANTS.QUESTION_SET_LIST_MAP_PREFIX}${hash}`;
  }

  static getInstance() {
    return new QuestionSetService();
  }

  async getQuestionSetById(id: string) {
    let questionSet = await redisService.getObject<QuestionSet>(this._getQuestionSetEntKey(id));
    if (questionSet) {
      return questionSet;
    }
    const whereClause = {
      identifier: id,
    };

    questionSet = await QuestionSet.findOne({
      where: whereClause,
      attributes: { exclude: ['id'] },
      raw: true,
    });

    await redisService.setEntity(this._getQuestionSetEntKey(id), questionSet);

    return questionSet;
  }

  async getQuestionSetByIdAndStatus(id: string, additionalConditions: object = {}) {
    // Combine base conditions with additional conditions
    let questionSet = await redisService.getObject<QuestionSet>(this._getQuestionSetEntKey(id));
    if (questionSet) {
      return questionSet;
    }
    const conditions = {
      identifier: id,
      ...additionalConditions, // Spread additional conditions here
    };

    questionSet = await QuestionSet.findOne({
      where: conditions,
      attributes: { exclude: ['id'] },
      raw: true,
    });

    await redisService.setEntity(this._getQuestionSetEntKey(id), questionSet);

    return questionSet;
  }

  async createQuestionSetData(req: Optional<any, string> | undefined) {
    const questionSet = await QuestionSet.create(req);
    await redisService.removeKeysWithPrefix(this.REDIS_CONSTANTS.QUESTION_SET_LIST_MAP_PREFIX);
    return questionSet;
  }

  async updateQuestionSet(identifier: string, updateData: any) {
    const questionSet = await QuestionSet.update(updateData, {
      where: { identifier: identifier },
      returning: true,
    });
    await redisService.removeKey(this._getQuestionSetEntKey(identifier));
    await redisService.removeKeysWithPrefix(this.REDIS_CONSTANTS.QUESTION_SET_LIST_MAP_PREFIX);
    return questionSet;
  }

  async publishQuestionSetById(id: string, updatedBy: string) {
    const questionSet = await QuestionSet.update({ status: Status.LIVE, updated_by: updatedBy }, { where: { identifier: id }, returning: true });
    await redisService.removeKey(this._getQuestionSetEntKey(id));
    await redisService.removeKeysWithPrefix(this.REDIS_CONSTANTS.QUESTION_SET_LIST_MAP_PREFIX);
    return questionSet;
  }

  // Delete a question set (soft delete)
  async deleteQuestionSet(id: string) {
    const questionSet = await QuestionSet.update({ is_active: false }, { where: { identifier: id }, returning: true });
    await redisService.removeKey(this._getQuestionSetEntKey(id));
    await redisService.removeKeysWithPrefix(this.REDIS_CONSTANTS.QUESTION_SET_LIST_MAP_PREFIX);
    return questionSet;
  }

  // Discard question set (hard delete)
  async discardQuestionSet(id: string) {
    const questionSet = await QuestionSet.destroy({
      where: { identifier: id },
    });
    await redisService.removeKey(this._getQuestionSetEntKey(id));
    await redisService.removeKeysWithPrefix(this.REDIS_CONSTANTS.QUESTION_SET_LIST_MAP_PREFIX);
    return questionSet;
  }

  async getQuestionSetList(req: {
    filters: {
      is_active?: boolean;
      status?: Status;
      purpose?: QuestionSetPurposeType;
      search_query?: string;
      repository_id?: string;
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
    const limit: number = _.get(req, 'limit', DEFAULT_LIMIT);
    const offset: number = _.get(req, 'offset', 0);
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

    if (filters.purpose) {
      whereClause = {
        ...whereClause,
        purpose: filters.purpose,
      };
    }

    if (filters.search_query) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          Sequelize.literal(`
    EXISTS (
      SELECT 1 
      FROM jsonb_each_text(title) AS kv
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
          case 'title': {
            order.push([Sequelize.literal(`title->>'en'`), direction]);
            break;
          }
          case 'description': {
            order.push([Sequelize.literal(`description->>'en'`), direction]);
            break;
          }
          case 'repository': {
            order.push([Sequelize.literal(`repository->'name'->>'en'`), direction]);
            break;
          }
          case 'l1_skill': {
            order.push([Sequelize.literal(`taxonomy->'l1_skill'->'name'->>'en'`), direction]);
            break;
          }
          default: {
            order.push([column, direction]);
          }
        }
      }
    }

    const { rows, count } = await QuestionSet.findAndCountAll({
      logging: true,
      limit,
      offset,
      where: whereClause,
      attributes: { exclude: ['id'] },
      raw: true,
      order: order.length ? order : [['updated_at', 'desc']],
    });

    return {
      question_sets: rows,
      meta: {
        offset,
        limit,
        total: count,
      },
    };
  }

  async getQuestionSetsByIdentifiers(identifiers: string[]) {
    return QuestionSet.findAll({
      where: {
        identifier: {
          [Op.in]: identifiers,
        },
      },
      attributes: { exclude: ['id'] },
      raw: true,
    });
  }

  async getMainDiagnosticQuestionSet(filters: { repositoryIds: string[]; boardId?: string; classId?: string; l1SkillId?: string }) {
    let whereClause: any = {
      status: Status.LIVE,
      is_active: true,
      purpose: QuestionSetPurposeType.MAIN_DIAGNOSTIC,
      repository: {
        identifier: {
          [Op.in]: filters.repositoryIds,
        },
      },
    };

    if (filters.boardId) {
      whereClause = {
        ...whereClause,
        taxonomy: {
          ...(whereClause.taxonomy || {}),
          board: {
            identifier: filters.boardId,
          },
        },
      };
    }

    if (filters.classId) {
      whereClause = {
        ...whereClause,
        taxonomy: {
          ...(whereClause.taxonomy || {}),
          class: {
            identifier: filters.classId,
          },
        },
      };
    }

    if (filters.l1SkillId) {
      whereClause = {
        ...whereClause,
        taxonomy: {
          ...(whereClause.taxonomy || {}),
          l1_skill: {
            identifier: filters.l1SkillId,
          },
        },
      };
    }

    return QuestionSet.findOne({
      where: whereClause,
      attributes: { exclude: ['id'] },
      raw: true,
    });
  }

  async getPracticeQuestionSet(filters: { repositoryIds: string[]; classId: string; l1SkillId: string }) {
    const whereClause: any = {
      status: Status.LIVE,
      is_active: true,
      purpose: {
        [Op.ne]: QuestionSetPurposeType.MAIN_DIAGNOSTIC,
      },
      taxonomy: {
        class: {
          identifier: filters.classId,
        },
        l1_skill: {
          identifier: filters.l1SkillId,
        },
      },
      repository: {
        identifier: {
          [Op.in]: filters.repositoryIds,
        },
      },
    };

    return QuestionSet.findOne({
      where: whereClause,
      order: [['sequence', 'ASC']],
    });
  }

  async getNextPracticeQuestionSetInSequence(filters: { repositoryIds: string[]; classIds: string[]; l1SkillId: string; lastSetSequence: number }) {
    const whereClause: any = {
      status: Status.LIVE,
      is_active: true,
      sequence: {
        [Op.gt]: filters.lastSetSequence,
      },
      purpose: {
        [Op.ne]: QuestionSetPurposeType.MAIN_DIAGNOSTIC,
      },
      taxonomy: {
        class: {
          identifier: {
            [Op.in]: filters.classIds,
          },
        },
        l1_skill: {
          identifier: filters.l1SkillId,
        },
      },
      repository: {
        identifier: {
          [Op.in]: filters.repositoryIds,
        },
      },
    };

    return QuestionSet.findOne({
      where: whereClause,
      order: [['sequence', 'ASC']],
    });
  }

  async getNextSetSequence(data: { board_id: string; class_id: string; l1_skill_id: string; repository_id: string }) {
    const whereClause = {
      taxonomy: {
        board: {
          identifier: data.board_id,
        },
        class: {
          identifier: data.class_id,
        },
        l1_skill: {
          identifier: data.l1_skill_id,
        },
      },
      repository: {
        identifier: data.repository_id,
      },
    };

    const lastSet = await QuestionSet.findOne({
      where: whereClause,
      order: [['sequence', 'desc']],
    });

    return (lastSet?.sequence || 0) + 1;
  }
}

export const questionSetService = QuestionSetService.getInstance();

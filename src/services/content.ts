import { Op, Optional, Sequelize } from 'sequelize';
import { Content } from '../models/content';
import { Status } from '../enums/status';
import _ from 'lodash';
import { DEFAULT_LIMIT } from '../constants/constants';
import { cryptFactory } from './factories/cryptFactory';
import { redisService } from './integrations/redisService';

const REDIS_CONSTANTS = {
  CONTENT_ENT_KEY_PREFIX: 'content_ent',
  CONTENT_LIST_MAP_KEY_PREFIX: 'content_list_map_',
};

const _getContentListMapKey = (hash: string) => {
  return `${REDIS_CONSTANTS.CONTENT_LIST_MAP_KEY_PREFIX}${hash}`;
};

const _getContentEntKey = (identifier: string) => {
  return `${REDIS_CONSTANTS.CONTENT_ENT_KEY_PREFIX}:${identifier}`;
};

// Get a media Content by ID
export const getContentMediaById = async (getObject: { contentId: number; mediaIds: string[] }) => {
  const whereClause: any = { identifier: getObject.contentId };
  if (getObject.mediaIds) {
    const mediaConditions = getObject.mediaIds.map((id) => ({ id }));

    whereClause.media = {
      [Op.contains]: mediaConditions,
    };
  }

  return Content.findOne({
    where: whereClause,
    attributes: ['id', 'media'],
    raw: true,
  });
};

// Create a new content
export const createContentData = async (req: Optional<any, string> | undefined) => {
  const content = await Content.create(req);
  await redisService.setEntity(_getContentEntKey(content.identifier), content);
  return content;
};

// Get a single Content by ID
export const getContentById = async (id: string, additionalConditions: object = {}) => {
  // Combine base conditions with additional conditions
  let content = await redisService.getObject<Content>(_getContentEntKey(id));
  if (content) {
    return content;
  }
  const conditions = {
    identifier: id,
    ...additionalConditions,
  };

  content = await Content.findOne({
    where: conditions,
    attributes: { exclude: ['id'] },
    raw: true,
  });
  await redisService.setEntity(_getContentEntKey(id), content);
  return content;
};

// Get a multiple Contents by IDs
export const getContentByIds = async (ids: string[]): Promise<any> => {
  // Combine base conditions with additional conditions
  const sortedIds = ids.sort();
  const hash = cryptFactory.md5(sortedIds.join(','));
  let contentDetails = await redisService.getObject<Content[]>(_getContentListMapKey(hash));
  if (contentDetails) {
    return contentDetails;
  }
  const conditions = {
    identifier: ids,
  };

  contentDetails = await Content.findAll({
    where: conditions,
    attributes: { exclude: ['id'] },
    raw: true,
  });

  await redisService.setEntity(_getContentListMapKey(hash), contentDetails);

  return contentDetails;
};

// Publish content by id
export const publishContentById = async (id: string, updatedBy: string): Promise<any> => {
  const content = await Content.update({ status: Status.LIVE, updated_by: updatedBy }, { where: { identifier: id }, returning: true });
  await redisService.removeKey(_getContentEntKey(id));
  return content;
};

// Update content by identifier
export const updateContent = async (identifier: string, updateData: any) => {
  // Update the question in the database
  const content = await Content.update(updateData, {
    where: { identifier },
    returning: true,
  });
  await redisService.removeKey(_getContentEntKey(identifier));
  return content;
};

// Delete content (soft delete) by identifier
export const deleteContentByIdentifier = async (identifier: string): Promise<any> => {
  const content = await Content.update({ is_active: false }, { where: { identifier }, returning: true });
  await redisService.removeKey(_getContentEntKey(identifier));
  return content;
};

// Discard content (hard delete) by identifier
export const discardContentByIdentifier = async (identifier: string): Promise<any> => {
  const content = await Content.destroy({
    where: { identifier },
  });
  await redisService.removeKey(_getContentEntKey(identifier));
  return content;
};

// Get a list of contents with optional filters and pagination
export const getContentList = async (req: {
  filters: {
    is_active?: boolean;
    status?: Status;
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
}) => {
  const limit: number = _.get(req, 'limit', DEFAULT_LIMIT);
  const offset: number = _.get(req, 'offset', 0);
  const { filters = {}, sort_by } = req || {};
  const searchQuery: string = _.get(filters, 'search_query', '');

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

  if (searchQuery) {
    whereClause = {
      ...whereClause,
      [Op.or]: [
        Sequelize.literal(`
          EXISTS (
            SELECT 1
            FROM jsonb_each_text(name) AS kv
             WHERE LOWER(kv.value) LIKE '%${searchQuery.toLowerCase()}%'
          )
        `),
        Sequelize.literal(`
          EXISTS (
            SELECT 1
            FROM jsonb_each_text(description) AS kv
            WHERE LOWER(kv.value) LIKE '%${searchQuery.toLowerCase()}%'
          )
        `),
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
        case 'name': {
          order.push([Sequelize.literal(`name->>'en'`), direction]);
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

  const { rows, count } = await Content.findAndCountAll({
    limit,
    offset,
    where: whereClause,
    attributes: { exclude: ['id'] },
    order: order.length ? order : [['updated_at', 'desc']],
  });

  return {
    contents: rows,
    meta: {
      offset,
      limit,
      total: count,
    },
  };
};

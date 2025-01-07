import { Request, Response } from 'express';
import logger from '../../utils/logger';
import * as _ from 'lodash';
import questionSchema from './questionCreateValidationSchema.json';
import httpStatus from 'http-status';
import { questionService } from '../../services/questionService';
import { schemaValidation } from '../../services/validationService';
import * as uuid from 'uuid';
import { amlError } from '../../types/amlError';
import { ResponseHandler } from '../../utils/responseHandler';
import { getRepositoryById } from '../../services/repository';
import { boardService } from '../../services/boardService';
import { getClassById } from '../../services/class';
import { getSkillById } from '../../services/skill';
import { SkillType } from '../../enums/skillType';
import { getSubSkill } from '../../services/subSkill';
import { getQuestionBody } from './questionCreate.helper';

export const apiId = 'api.question.create';

const createQuestion = async (req: Request, res: Response) => {
  const requestBody = _.get(req, 'body');
  const msgid = _.get(req, ['body', 'params', 'msgid']);
  const dataBody = _.get(req, 'body.request');
  const resmsgid = _.get(res, 'resmsgid');

  // Validating the schema
  const isRequestValid: Record<string, any> = schemaValidation(requestBody, questionSchema);
  if (!isRequestValid.isValid) {
    const code = 'QUESTION_INVALID_INPUT';
    logger.error({ code, apiId, msgid, resmsgid, requestBody, message: isRequestValid.message });
    throw amlError(code, isRequestValid.message, 'BAD_REQUEST', 400);
  }

  // Check repository
  const repositoryId = dataBody.repository_id;
  const repository = await getRepositoryById(repositoryId);
  if (!repository) {
    const code = 'REPOSITORY_NOT_EXISTS';
    logger.error({ code, apiId, msgid, resmsgid, message: `Repository not exists` });
    throw amlError(code, 'Repository not exists', 'NOT_FOUND', 404);
  }

  // Create the repository object
  const repositoryObject = {
    identifier: repository.identifier,
    name: repository.name,
  };

  // Check board
  const boardId = dataBody.board_id;
  const board = await boardService.getBoardByIdentifier(boardId);
  if (!board) {
    const code = 'BOARD_NOT_EXISTS';
    logger.error({ code, apiId, msgid, resmsgid, message: `Board not exists` });
    throw amlError(code, 'Board not exists', 'NOT_FOUND', 404);
  }

  const boardObject = {
    identifier: board.identifier,
    name: board.name,
  };

  // Check class
  const classId = dataBody.class_id;
  const classEntity = await getClassById(classId);
  if (!classEntity) {
    const code = 'CLASS_NOT_EXISTS';
    logger.error({ code, apiId, msgid, resmsgid, message: `Class not exists` });
    throw amlError(code, 'Class not exists', 'NOT_FOUND', 404);
  }

  const classObject = {
    identifier: classEntity.identifier,
    name: classEntity.name,
  };

  // Check l1_skill and add ID along with the name
  const l1Skill = await getSkillById(dataBody.l1_skill_id);
  if (!l1Skill || l1Skill.type !== SkillType.L1_SKILL) {
    const code = 'L1_SKILL_NOT_EXISTS';
    logger.error({ code, message: `L1 Skill not exists` });
    throw amlError(code, 'L1 Skill not exists', 'NOT_FOUND', 404);
  }

  const l1SkillObject = {
    identifier: l1Skill.identifier,
    name: l1Skill.name,
  };

  // Check l2_skill (assuming it's an array of skills) and add IDs along with names
  const l2SkillObjects = [];
  for (const l2SkillId of dataBody.l2_skill_ids || []) {
    const l2Skill = await getSkillById(l2SkillId);
    if (!l2Skill || l2Skill.type !== SkillType.L2_SKILL) {
      const code = 'L2_SKILL_NOT_EXISTS';
      logger.error({ code, message: `L2 Skill not exists` });
      throw amlError(code, 'L2 Skill not exists', 'NOT_FOUND', 404);
    }
    l2SkillObjects.push({
      identifier: l2Skill.identifier,
      name: l2Skill.name,
    });
  }

  // Check l3_skill (assuming it's an array of skills) and add IDs along with names
  const l3SkillObjects = [];
  for (const l3SkillId of dataBody.l3_skill_ids || []) {
    const l3Skill = await getSkillById(l3SkillId);
    if (!l3Skill || l3Skill.type !== SkillType.L3_SKILL) {
      const code = 'L3_SKILL_NOT_EXISTS';
      logger.error({ code, message: `L3 Skill not exists` });
      throw amlError(code, 'L3 Skill not exists', 'NOT_FOUND', 404);
    }
    l3SkillObjects.push({
      identifier: l3Skill.identifier,
      name: l3Skill.name,
    });
  }

  const subSkillObjects = [];
  for (const subSkillId of dataBody.sub_skill_ids || []) {
    const subSkill = await getSubSkill(subSkillId);
    if (!subSkill) {
      const code = 'SUB_SKILL_NOT_EXISTS';
      logger.error({ code, message: `Missing sub-skills` });
      throw amlError(code, 'sub Skill not exists', 'NOT_FOUND', 404);
    }
    subSkillObjects.push({
      identifier: subSkill.id,
      name: subSkill.name,
    });
  }

  // Construct the questionData object with all updated objects including sub-skills with IDs
  const questionData = _.assign(dataBody, {
    question_body: getQuestionBody(_.cloneDeep(dataBody)),
    is_active: true,
    status: 'draft',
    identifier: uuid.v4(),
    created_by: 'manual',
    repository: repositoryObject,
    taxonomy: {
      board: boardObject,
      class: classObject,
      l1_skill: l1SkillObject,
      l2_skill: l2SkillObjects,
      l3_skill: l3SkillObjects,
    },
    sub_skills: subSkillObjects,
  });

  // Create the question
  const insertedQuestionData = await questionService.createQuestionData(questionData);

  logger.info({ apiId, requestBody, message: `Question Created Successfully with identifier:${insertedQuestionData.identifier}` });
  ResponseHandler.successResponse(req, res, { status: httpStatus.OK, data: { message: 'Question Successfully Created', identifier: insertedQuestionData.identifier } });
};

export default createQuestion;

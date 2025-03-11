import { Request, Response } from 'express';
import * as _ from 'lodash';
import httpStatus from 'http-status';
import { ResponseHandler } from '../../../utils/responseHandler';
import { readLearnerAggregateData } from '../../../services/learnerProficiencyData';
import logger from '../../../utils/logger';
import { amlError } from '../../../types/amlError';

const learnerProficiencyDataRead = async (req: Request, res: Response) => {
  const apiId = _.get(req, 'id');
  const learner_id = _.get(req, 'params.learner_id');

  const learner = (req as any).learner;

  if (learner.identifier !== learner_id) {
    const code = 'LEARNER_DOES_NOT_EXIST';
    logger.error(JSON.stringify({ code, apiId, message: 'Learner does not exist' }));
    throw amlError(code, 'Learner does not exist', 'NOT_FOUND', 404);
  }

  // TODO: filter by skill/grade

  const { learnerAggregateData } = await readLearnerAggregateData(learner_id);

  ResponseHandler.successResponse(req, res, {
    status: httpStatus.OK,
    data: { message: 'Learner data read successfully', data: learnerAggregateData },
  });
};

export default learnerProficiencyDataRead;

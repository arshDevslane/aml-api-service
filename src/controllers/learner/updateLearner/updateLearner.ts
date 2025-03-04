import { Request, Response } from 'express';
import * as _ from 'lodash';
import httpStatus from 'http-status';
import { schemaValidation } from '../../../services/validationService';
import logger from '../../../utils/logger';
import { ResponseHandler } from '../../../utils/responseHandler';
import { amlError } from '../../../types/amlError';
import { learnerService } from '../../../services/learnerService';
import updateLearnerValidationSchema from './updateLearnerValidationSchema.json';

const updateLearner = async (req: Request, res: Response) => {
  const requestBody = _.get(req, 'body');
  const msgid = _.get(req, ['body', 'params', 'msgid']);
  const dataBody = _.get(req, 'body.request');
  const resmsgid = _.get(res, 'resmsgid');
  const learner = (req as any).learner;
  const apiId = _.get(req, 'id');

  // Validate request body
  const isRequestValid: Record<string, any> = schemaValidation(requestBody, updateLearnerValidationSchema);

  if (!isRequestValid.isValid) {
    const code = 'LEARNER_INVALID_INPUT';
    logger.error({ code, apiId, msgid, resmsgid, requestBody, message: isRequestValid.message });
    throw amlError(code, isRequestValid.message, 'BAD_REQUEST', 400);
  }

  // Update preferred language
  const [, updatedLearners] = await learnerService.updateLearner(learner.identifier, dataBody);

  // Send success response with updated learner
  ResponseHandler.successResponse(req, res, {
    status: httpStatus.OK,
    data: { message: 'Preferred language updated successfully', learner: updatedLearners[0] },
  });
};

export default updateLearner;

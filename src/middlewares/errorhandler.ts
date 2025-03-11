import { NextFunction, Request, Response } from 'express';
import { ResponseHandler } from '../utils/responseHandler';
import _ from 'lodash';
import { AmlError } from '../types/amlError';
import logger from '../utils/logger';

export const amlErrorHandler = (amlErr: AmlError, req: Request, res: Response, _next: NextFunction) => {
  logger.error(JSON.stringify({ apiId: _.get(req, 'id'), resmsgid: _.get(res, 'resmsgid'), ...amlErr }));

  if (res.headersSent) {
    return _next(amlErr);
  }
  return ResponseHandler.amlErrorResponse(amlErr, req, res);
};

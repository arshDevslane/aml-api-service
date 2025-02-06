import { Request, Response } from 'express';
import logger from '../../utils/logger';
import * as _ from 'lodash';
import httpStatus from 'http-status';
import { getRepositoryById, publishRepositoryById } from '../../services/repository';
import { amlError } from '../../types/amlError';
import { ResponseHandler } from '../../utils/responseHandler';
import { Status } from '../../enums/status';
import { User } from '../../models/users';
import { getUserByIdentifier } from '../../services/user';
import { UserTransformer } from '../../transformers/entity/user.transformer';

export const apiId = 'api.repository.publish';

const publishRepository = async (req: Request, res: Response) => {
  const repository_id = _.get(req, 'params.repository_id');
  const msgid = _.get(req, ['body', 'params', 'msgid']);
  const resmsgid = _.get(res, 'resmsgid');
  const loggedInUser: User | undefined = (req as any).user;

  // Fetch the repository details
  const repositoryDetails = await getRepositoryById(repository_id, { status: Status.DRAFT });

  // Validate repository existence
  if (_.isEmpty(repositoryDetails)) {
    const code = 'REPOSITORY_NOT_EXISTS';
    logger.error({ code, apiId, msgid, resmsgid, message: `Repository not exists` });
    throw amlError(code, 'Repository not exists', 'NOT_FOUND', 404);
  }

  // Publish the repository
  const [, affectedRows] = await publishRepositoryById(repository_id, loggedInUser!.identifier);
  const createdByUser = await getUserByIdentifier(affectedRows?.[0]?.created_by);
  const users = new UserTransformer().transformList(_.uniqBy([createdByUser, loggedInUser], 'identifier').filter((v) => !!v));

  // Log success
  logger.info({ apiId, repository_id, message: 'Repository Published successfully' });

  // Send success response
  ResponseHandler.successResponse(req, res, { status: httpStatus.OK, data: { message: 'Repository Successfully Published', repository: affectedRows?.[0] ?? {}, users } });
};

export default publishRepository;

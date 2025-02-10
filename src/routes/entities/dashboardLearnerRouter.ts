import express from 'express';
import { setDataToRequestObject } from '../../middlewares/setDataToReqObj';
import listLearners from '../../controllers/learnerSearch/learnerSearch';

export const dashboardLearnerRouter = express.Router();

dashboardLearnerRouter.post('/list', setDataToRequestObject('api.learner.list'), listLearners);

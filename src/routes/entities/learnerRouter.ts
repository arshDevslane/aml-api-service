import express from 'express';
import { learnerJourneyRouter } from './learnerJourneyRouter';
import learnerProficiencyRouter from './learnerProficiencyRouter';
import evaluateLearner from '../../controllers/learner/learnerNextStep/evaluateLearner';
import { setDataToRequestObject } from '../../middlewares/setDataToReqObj';
import fetchLoggedInLearner from '../../controllers/learner/fetchLoggedInLearner/fetchLoggedInLearner';
import updateLearner from '../../controllers/learner/updateLearner/updateLearner';

export const learnerRouter = express.Router();

learnerRouter.use('/journey', learnerJourneyRouter);

learnerRouter.use('/proficiency-data', learnerProficiencyRouter);

learnerRouter.post('/evaluate/:learner_id', evaluateLearner);

learnerRouter.get('/read', setDataToRequestObject('api.learner.read'), fetchLoggedInLearner);

learnerRouter.post('/update', updateLearner);

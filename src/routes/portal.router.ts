import boardRouter from './entities/boardRouter';
import questionSetRouter from './entities/questionSetRouter';
import { learnerAuthRouter } from './learnerAuth.route';
import { learnerRouter } from './entities/learnerRouter';
import express from 'express';
import session from 'express-session';
import { appConfiguration, AppDataSource } from '../config';
import csrf from 'csurf';
import { learnerAuth } from '../middlewares/learnerAuth';
import ttsRouter from './entities/ttsRouter';
import classRouter from './entities/classRouter';
import SequelizeStore from 'connect-session-sequelize';

export const portalRouter = express.Router();

// ✅ Initialize Sequelize Session Store
const SessionStore = SequelizeStore(session.Store);
const sequelizeSessionStore = new SessionStore({
  db: AppDataSource, // ✅ Use Sequelize's instance
  tableName: 'learner_sessions', // ✅ Custom table for storing sessions
  checkExpirationInterval: 15 * 60 * 1000, // ✅ Cleanup expired sessions every 15 mins
  expiration: 24 * 60 * 60 * 1000, // ✅ Sessions expire after 24 hours
});

// ✅ Sync session store with the database
sequelizeSessionStore.sync();

portalRouter.use(
  session({
    store: sequelizeSessionStore,
    secret: appConfiguration.appSecret, // Use a strong secret in production
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: 'strict',
      // secure: process.env.AML_SERVICE_APPLICATION_ENV === 'production',
      secure: false, // TODO: needs to be addressed ASAP
      maxAge: 1000 * 60 * 40, // 40 minutes
      httpOnly: false, // Mitigate XSS attacks
    },
  }),
);

const csrfProtection = csrf({ cookie: true });
portalRouter.use(csrfProtection);

portalRouter.use('/board', learnerAuth, boardRouter);

portalRouter.use('/class', classRouter);

portalRouter.use('/question-set', learnerAuth, questionSetRouter);

portalRouter.use('/auth', learnerAuthRouter);

portalRouter.use('/learner', learnerAuth, learnerRouter);

portalRouter.use('/tts', learnerAuth, ttsRouter);

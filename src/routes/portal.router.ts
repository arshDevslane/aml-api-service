import boardRouter from './entities/boardRouter';
import questionSetRouter from './entities/questionSetRouter';
import { learnerAuthRouter } from './learnerAuth.route';
import { learnerRouter } from './entities/learnerRouter';
import express from 'express';
import session from 'express-session';
import { appConfiguration, AppDataSource } from '../config';
import pg from 'pg';
import ConnectPgSimple from 'connect-pg-simple';
import csrf from 'csurf';
import { learnerAuth } from '../middlewares/learnerAuth';
import ttsRouter from './entities/ttsRouter';
import classRouter from './entities/classRouter';

export const portalRouter = express.Router();

// AppDataSource.connectionManager.pool

// PostgreSQL connection
// const pgPool = new pg.Pool({
//   // @ts-expect-error no typings
//   ...AppDataSource.connectionManager.pool.options,
//   // @ts-expect-error no typings
//   Client: AppDataSource.connectionManager.lib.Client,
// });
// @ts-expect-error no typings
const sequelizePoolConfig = AppDataSource.connectionManager.pool.options;
const pgPool = new pg.Pool({
  user: sequelizePoolConfig.username,
  host: sequelizePoolConfig.host,
  database: sequelizePoolConfig.database,
  password: sequelizePoolConfig.password,
  port: sequelizePoolConfig.port,
  max: sequelizePoolConfig.max ? Math.floor(sequelizePoolConfig.max * 0.2) : 10, // Adjust pool size if needed
  idleTimeoutMillis: sequelizePoolConfig.idle || 10000,
  connectionTimeoutMillis: sequelizePoolConfig.acquire || 60000,
});

const PgSession = ConnectPgSimple(session);

portalRouter.use(
  session({
    store: new PgSession({
      pool: pgPool, // Connection pool
      tableName: 'learner_sessions', // Using a specific table for session storage
    }),
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

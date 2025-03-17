import { Sequelize } from 'sequelize-typescript';
import appConfiguration from './config';
import path from 'path';
import logger from '../utils/logger';

const {
  DB: { port, name, password, host, user, minConnections, maxConnections, readReplica },
} = appConfiguration;

let replication: any = {
  write: {
    host: host,
    port: port,
    username: user,
    password: password,
    database: name,
  },
};

if (readReplica) {
  replication = {
    ...replication,
    read: [
      {
        host: readReplica,
        port: port,
        username: user,
        password: password,
        database: name,
      },
    ],
  };
}

const AppDataSource = new Sequelize({
  dialect: 'postgres',
  replication,
  models: [path.join(__dirname, 'models', '*.ts')],
  logging: false,
  pool: {
    min: minConnections,
    max: maxConnections,
    idle: 500, // in ms
    acquire: 2 * 60 * 1000, // in ms
  },
});

(async () => {
  logger.info('Connection initiated');
  try {
    await AppDataSource.authenticate();
    logger.info('Database connected successfully!');
  } catch (error) {
    logger.error('Database connection failed:', error);
  }
})()
  .then(() => {
    logger.info('Promise resolved successfully');
  })
  .catch(() => {
    logger.info('Promise failed');
  });

export const query = async (query: string) => {
  const [results, metadata] = await AppDataSource.query(query);
  return {
    results,
    metadata,
  };
};

export default AppDataSource;

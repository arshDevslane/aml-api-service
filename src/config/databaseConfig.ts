import { Sequelize } from 'sequelize-typescript';
import appConfiguration from './config';
import path from 'path';

const {
  DB: { port, name, password, host, user },
} = appConfiguration;

const AppDataSource = new Sequelize({
  dialect: 'postgres',
  host: host,
  port: port,
  username: user,
  password: password,
  database: name,
  models: [path.join(__dirname, 'models', '*.ts')],
  logging: false,
  pool: {
    min: 50,
    max: 100,
    idle: 5 * 1000, // in ms
    acquire: 60 * 1000, // in ms
  },
});

export const query = async (query: string) => {
  const [results, metadata] = await AppDataSource.query(query);
  return {
    results,
    metadata,
  };
};

export default AppDataSource;

import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'skyroute',
  password: process.env.DB_PASSWORD ?? 'skyroute_secret',
  database: process.env.DB_NAME ?? 'skyroute_db',
  entities: [path.join(__dirname, '../../features/**/entities/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations/*.{ts,js}')],
  synchronize: false,
  logging: false,
};

export default new DataSource(dataSourceOptions);

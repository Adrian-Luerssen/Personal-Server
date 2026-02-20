import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  synchronize: false,
  entityPrefix: 'app_',
  logging: process.env.NODE_ENV === 'development' ? ['query', 'schema'] : true,
  ssl: {
    rejectUnauthorized: false,
  },
});

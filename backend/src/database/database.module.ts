import { Module, Global } from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import { MONGODB_CONNECTION_TOKEN } from './database.constants';

const MONGODB_URI_KEY = 'MONGODB_URI';
const MONGODB_DB_NAME_KEY = 'MONGODB_DB_NAME';

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: MONGODB_CONNECTION_TOKEN,
      useFactory: async (configService: ConfigService): Promise<Db> => {
        try {
          const uri = configService.get<string>(MONGODB_URI_KEY)!;
          const dbName = configService.get<string>(MONGODB_DB_NAME_KEY)!;
          const client = await MongoClient.connect(uri);
          return client.db(dbName);
        } catch (e) {
          throw e;
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [MONGODB_CONNECTION_TOKEN],
})
export class DatabaseModule {}

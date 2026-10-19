// src/main.ts
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGIN').split(','),
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(config.getOrThrow<number>('PORT'));
}

void bootstrap();
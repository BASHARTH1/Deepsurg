import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // The Angular dev server proxies /api, so CORS is only needed when the two are
  // served from different origins (previews, separate deployments).
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:4200').split(',').map((o) => o.trim()),
    methods: ['GET', 'POST'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`DeepSurg API listening on http://localhost:${port}/api`);
}

void bootstrap();

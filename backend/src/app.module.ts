import { Module } from '@nestjs/common';
import { ContactModule } from './contact/contact.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [ContactModule],
  controllers: [HealthController],
})
export class AppModule {}

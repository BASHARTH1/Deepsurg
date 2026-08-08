import { Module } from '@nestjs/common';
import { CompanyModule } from './company/company.module';
import { ContactModule } from './contact/contact.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [CompanyModule, ContactModule],
  controllers: [HealthController],
})
export class AppModule {}

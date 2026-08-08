import { Controller, Get } from '@nestjs/common';
import { CompanyService } from './company.service';

/** Site content served to the Angular front end. */
@Controller('company')
export class CompanyController {
  constructor(private readonly company: CompanyService) {}

  @Get('capabilities')
  capabilities() {
    return this.company.capabilities();
  }

  @Get('metrics')
  metrics() {
    return this.company.metrics();
  }

  @Get('milestones')
  milestones() {
    return this.company.milestones();
  }

  @Get('overview')
  overview() {
    return this.company.overview();
  }
}

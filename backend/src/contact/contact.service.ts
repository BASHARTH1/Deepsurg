import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateContactDto } from './dto/create-contact.dto';

export interface ContactEnquiry extends CreateContactDto {
  id: string;
  receivedAt: string;
}

/**
 * Stores enquiries in memory. Swap the array for a repository (or a CRM call)
 * when persistence is wired up — the controller contract does not change.
 */
@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly enquiries: ContactEnquiry[] = [];

  create(dto: CreateContactDto): ContactEnquiry {
    const enquiry: ContactEnquiry = {
      ...dto,
      id: `DS-${randomUUID().slice(0, 8).toUpperCase()}`,
      receivedAt: new Date().toISOString(),
    };

    this.enquiries.push(enquiry);
    this.logger.log(`Enquiry ${enquiry.id} from ${enquiry.organisation} (${enquiry.interest})`);

    return enquiry;
  }

  count(): number {
    return this.enquiries.length;
  }
}

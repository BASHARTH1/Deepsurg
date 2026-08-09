import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateContactDto } from './dto/create-contact.dto';
import { MailService } from './mail.service';

export interface ContactEnquiry extends CreateContactDto {
  id: string;
  receivedAt: string;
}

/**
 * Turns a submitted form into an email. Nothing is stored: the API runs as a
 * serverless function, so anything kept in memory disappears with the instance
 * — the inbox is the record.
 */
@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly mail: MailService) {}

  async create(dto: CreateContactDto): Promise<ContactEnquiry> {
    const enquiry: ContactEnquiry = {
      ...dto,
      id: `DS-${randomUUID().slice(0, 8).toUpperCase()}`,
      receivedAt: new Date().toISOString(),
    };

    // Better to fail visibly — the form then tells the visitor to email us
    // directly — than to accept an enquiry nobody will ever read.
    if (!this.mail.enabled) {
      this.logger.error(`Enquiry ${enquiry.id} refused: mail is not configured`);
      throw new ServiceUnavailableException(
        'We could not send your message. Please email omar@deepsurg.ai directly.',
      );
    }

    try {
      await this.mail.send({
        subject: `[${enquiry.interest}] ${enquiry.name} — ${enquiry.organisation}`,
        replyTo: enquiry.email,
        text: format(enquiry),
      });
    } catch (error) {
      this.logger.error(`Enquiry ${enquiry.id} could not be delivered`, error as Error);
      throw new ServiceUnavailableException(
        'We could not send your message. Please email omar@deepsurg.ai directly.',
      );
    }

    this.logger.log(`Enquiry ${enquiry.id} from ${enquiry.organisation} (${enquiry.interest})`);
    return enquiry;
  }
}

function format(enquiry: ContactEnquiry): string {
  return [
    `Reference:    ${enquiry.id}`,
    `Received:     ${enquiry.receivedAt}`,
    '',
    `Name:         ${enquiry.name}`,
    `Email:        ${enquiry.email}`,
    `Organisation: ${enquiry.organisation}`,
    `Interest:     ${enquiry.interest}`,
    '',
    enquiry.message,
  ].join('\n');
}

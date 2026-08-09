import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async submit(@Body() dto: CreateContactDto) {
    const enquiry = await this.contact.create(dto);

    return {
      id: enquiry.id,
      receivedAt: enquiry.receivedAt,
      message: 'Thank you — a member of the DeepSurg team will reply within two working days.',
    };
  }
}

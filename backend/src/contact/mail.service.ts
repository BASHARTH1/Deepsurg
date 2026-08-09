import { Injectable, Logger } from '@nestjs/common';

export interface Mail {
  subject: string;
  text: string;
  /** Where a reply should go — the person who filled the form. */
  replyTo: string;
}

/**
 * Sends transactional mail through Resend's HTTP API.
 *
 * HTTP rather than SMTP on purpose: no connection pooling to keep alive, which
 * suits a function that may be frozen between requests, and no extra dependency.
 *
 * Configure with:
 *   RESEND_API_KEY   secret from https://resend.com/api-keys
 *   CONTACT_TO       where enquiries land       (default omar@deepsurg.ai)
 *   CONTACT_FROM     verified sender for Resend (default onboarding@resend.dev)
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private readonly key = process.env.RESEND_API_KEY;
  private readonly to = process.env.CONTACT_TO ?? 'omar@deepsurg.ai';
  private readonly from = process.env.CONTACT_FROM ?? 'DeepSurg <onboarding@resend.dev>';

  /** False when no key is configured, so callers can refuse to accept mail. */
  get enabled(): boolean {
    return Boolean(this.key);
  }

  async send(mail: Mail): Promise<void> {
    if (!this.key) {
      // Never silently swallow a message: say plainly that it went nowhere.
      this.logger.warn(`RESEND_API_KEY is not set — "${mail.subject}" was not delivered`);
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [this.to],
        reply_to: mail.replyTo,
        subject: mail.subject,
        text: mail.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Resend responded ${response.status}: ${detail.slice(0, 300)}`);
    }
  }
}

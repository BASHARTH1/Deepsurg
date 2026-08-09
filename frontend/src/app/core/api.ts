import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContactRequest {
  name: string;
  email: string;
  organisation: string;
  interest: string;
  message: string;
}

interface Web3FormsReply {
  success: boolean;
  message: string;
}

const ENDPOINT = 'https://api.web3forms.com/submit';

/**
 * Delivers the contact form.
 *
 * Web3Forms emails the submission straight to the address the access key was
 * issued for, so the site needs no server of its own. The key is meant to live
 * in the browser — it only ever grants "send to that one inbox".
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  submitContact(payload: ContactRequest): Observable<string> {
    if (!environment.contactFormKey) {
      return throwError(
        () => new Error('The contact form is not configured yet — please email us directly.'),
      );
    }

    return this.http
      .post<Web3FormsReply>(ENDPOINT, {
        access_key: environment.contactFormKey,
        subject: `[${payload.interest}] ${payload.name} — ${payload.organisation}`,
        from_name: 'DeepSurg website',
        // Replying to the notification reaches the person who wrote in.
        replyto: payload.email,
        name: payload.name,
        email: payload.email,
        organisation: payload.organisation,
        interest: payload.interest,
        message: payload.message,
      })
      .pipe(
        map((reply) => {
          if (!reply.success) {
            throw new Error(reply.message);
          }
          return reply.message;
        }),
      );
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContactRequest {
  name: string;
  email: string;
  organisation: string;
  interest: string;
  message: string;
}

export interface ContactResponse {
  id: string;
  receivedAt: string;
  message: string;
}

/**
 * Talks to the DeepSurg NestJS API. Page content is authored in the components
 * themselves, so the contact form is the only thing that needs the server.
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  submitContact(payload: ContactRequest): Observable<ContactResponse> {
    return this.http.post<ContactResponse>(`${this.base}/contact`, payload);
  }
}

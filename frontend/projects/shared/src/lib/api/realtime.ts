import { DOCUMENT, inject, Injectable, InjectionToken } from '@angular/core';
import type Echo from 'laravel-echo';
import type { EchoOptions } from 'laravel-echo';
import { Observable, retry, share, switchMap } from 'rxjs';
import { ApiClient } from './api-client';
import { ORDER_UPDATED_EVENT, ORDERS_CHANNEL, type OrderUpdated } from './order';

/** Creates the Echo client; tests swap it for a fake. Echo + pusher-js load on first use, off the initial bundle. */
export const ECHO_FACTORY = new InjectionToken<
  (options: EchoOptions<'reverb'>) => Promise<Echo<'reverb'>>
>('ECHO_FACTORY', {
  providedIn: 'root',
  factory: () => async (options) => {
    const [{ default: Echo }, { default: Pusher }] = await Promise.all([
      import('laravel-echo'),
      import('pusher-js'),
    ]);
    return new Echo({ ...options, Pusher });
  },
});

/** `pusher-js` signature data from `POST /api/broadcasting/auth`. */
interface ChannelAuth {
  auth: string;
  channel_data?: string;
}

/**
 * Echo options for Reverb behind nginx: same host, TLS on 443, socket at `/app/{key}`.
 * Channel auth goes through ApiClient so the session cookie and `X-XSRF-TOKEN` go along.
 */
export function echoOptions(key: string, host: string, api: ApiClient): EchoOptions<'reverb'> {
  return {
    broadcaster: 'reverb',
    key,
    wsHost: host,
    wsPort: 443,
    wssPort: 443,
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
    channelAuthorization: {
      customHandler: ({ socketId, channelName }, callback) =>
        api
          .post<ChannelAuth>('/broadcasting/auth', {
            socket_id: socketId,
            channel_name: channelName,
          })
          .subscribe({
            next: (data) => callback(null, data),
            error: (e: unknown) => callback(new Error(JSON.stringify(e)), null),
          }),
    },
  };
}

/** Reverb connection. Connects on the first subscriber and disconnects after the last one leaves. */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly api = inject(ApiClient);
  private readonly createEcho = inject(ECHO_FACTORY);
  private readonly host = inject(DOCUMENT).location.hostname;

  /**
   * Each `order.updated`, plus `null` after a reconnect (events may have been missed while offline).
   * Either way: refetch. Not deduped by version, since status moves keep the version.
   */
  readonly orderUpdates$: Observable<OrderUpdated | null> = this.api
    // The key comes from the API (`REVERB_APP_KEY` in api/.env), so it never drifts from the server.
    .get<{ key: string }>('/realtime')
    .pipe(
      switchMap(
        ({ key }) =>
          new Observable<OrderUpdated | null>((subscriber) => {
            let echo: Echo<'reverb'> | null = null;
            let closed = false;
            void this.createEcho(echoOptions(key, this.host, this.api)).then(
              (created) => {
                if (closed) {
                  created.disconnect();
                  return;
                }
                echo = created;
                let connectedBefore = false;
                echo.connector.pusher.connection.bind('connected', () => {
                  if (connectedBefore) {
                    subscriber.next(null);
                  }
                  connectedBefore = true;
                });
                echo
                  .private(ORDERS_CHANNEL)
                  .listen(ORDER_UPDATED_EVENT, (event: OrderUpdated) => subscriber.next(event));
              },
              (e: unknown) => subscriber.error(e),
            );
            return () => {
              closed = true;
              echo?.disconnect();
            };
          }),
      ),
      // Key fetch failed (offline, server restarting): try again later; the list still works by hand.
      retry({ delay: 5000 }),
      share(),
    );
}

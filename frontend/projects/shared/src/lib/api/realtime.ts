import { DOCUMENT, inject, Injectable, InjectionToken } from '@angular/core';
import type Echo from 'laravel-echo';
import type { EchoOptions } from 'laravel-echo';
import { Observable, retry, share, switchMap, throwError, timer } from 'rxjs';
import { type ApiError, ApiClient } from './api-client';
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
            // pusher-js keeps only the message: carry the API error code in it.
            error: (e: unknown) => callback(new Error((e as ApiError).code), null),
          }),
    },
  };
}

/** Longest wait between reconnect attempts. */
const MAX_RETRY_DELAY = 30_000;
/** How long the socket stays open after the last subscriber leaves (e.g. list → detail → list). */
const LINGER = 30_000;

/** `pusher:subscription_error` payload; `error` is the message (here: the API error code). */
interface SubscriptionError {
  error?: string;
  status?: number;
}

/**
 * Reverb connection. Connects on the first subscriber, stays open for a while after the last one
 * leaves. Failures retry with backoff, except a 401 (session gone), which errors the stream.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly api = inject(ApiClient);
  private readonly createEcho = inject(ECHO_FACTORY);
  private readonly host = inject(DOCUMENT).location.hostname;

  /**
   * Each `order.updated`, plus `null` whenever the channel (re)subscribes: on the first connect and
   * after reconnects, since events may have been missed. Either way: refetch. Not deduped by version,
   * since status moves keep the version.
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
                echo
                  .private(ORDERS_CHANNEL)
                  .subscribed(() => subscriber.next(null))
                  .error((e: SubscriptionError) =>
                    subscriber.error({
                      code:
                        e.status === 401 ? 'unauthenticated' : (e.error ?? 'realtime.subscription'),
                      message: 'channel subscription failed',
                    } satisfies ApiError),
                  )
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
      retry({
        delay: (error: unknown, attempt) =>
          (error as Partial<ApiError>).code === 'unauthenticated'
            ? throwError(() => error)
            : timer(Math.min(MAX_RETRY_DELAY, 1000 * 2 ** (attempt - 1))),
        resetOnSuccess: true,
      }),
      share({ resetOnRefCountZero: () => timer(LINGER) }),
    );
}

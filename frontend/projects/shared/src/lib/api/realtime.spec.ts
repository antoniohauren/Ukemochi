import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type Echo from 'laravel-echo';
import type { EchoOptions } from 'laravel-echo';
import { ApiClient } from './api-client';
import type { OrderUpdated } from './order';
import { ECHO_FACTORY, echoOptions, RealtimeService } from './realtime';

class FakeEcho {
  readonly listeners = new Map<string, (event: OrderUpdated) => void>();
  subscribed: () => void = () => undefined;
  failed: (e: { error?: string; status?: number }) => void = () => undefined;
  channel = '';
  disconnect = vi.fn();
  constructor(readonly options: EchoOptions<'reverb'>) {}
  private(channel: string) {
    this.channel = channel;
    const ch = {
      subscribed: (cb: () => void) => ((this.subscribed = cb), ch),
      error: (cb: FakeEcho['failed']) => ((this.failed = cb), ch),
      listen: (event: string, cb: (event: OrderUpdated) => void) => (
        this.listeners.set(event, cb),
        ch
      ),
    };
    return ch;
  }
}

describe('RealtimeService', () => {
  let http: HttpTestingController;
  let echoes: FakeEcho[];
  let seen: (OrderUpdated | null)[];

  beforeEach(() => {
    echoes = [];
    seen = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ECHO_FACTORY,
          useValue: (options: EchoOptions<'reverb'>) => {
            const echo = new FakeEcho(options);
            echoes.push(echo);
            return Promise.resolve(echo as unknown as Echo<'reverb'>);
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => vi.useRealTimers());

  async function connect(key = 'k') {
    const sub = TestBed.inject(RealtimeService).orderUpdates$.subscribe({
      next: (e) => seen.push(e),
      error: (e: unknown) => seen.push({ id: -1, version: -1, error: e } as OrderUpdated),
    });
    http.expectOne('/api/realtime').flush({ key });
    await Promise.resolve();
    return sub;
  }

  it('connects with the key from the API and emits order.updated on the private orders channel', async () => {
    await connect('k3y');
    const [echo] = echoes;
    expect(echo.options).toMatchObject({ broadcaster: 'reverb', key: 'k3y', forceTLS: true });
    expect(echo.channel).toBe('orders');
    echo.listeners.get('.order.updated')?.({ id: 7, version: 1 });
    echo.listeners.get('.order.updated')?.({ id: 7, version: 1 });
    expect(seen).toEqual([
      { id: 7, version: 1 },
      { id: 7, version: 1 },
    ]);
  });

  it('emits null each time the channel subscribes: first connect and every reconnect', async () => {
    await connect();
    echoes[0].subscribed();
    echoes[0].subscribed();
    expect(seen).toEqual([null, null]);
  });

  it('shares one connection between subscribers', async () => {
    const realtime = TestBed.inject(RealtimeService);
    realtime.orderUpdates$.subscribe();
    realtime.orderUpdates$.subscribe();
    http.expectOne('/api/realtime').flush({ key: 'k' });
    expect(echoes.length).toBe(1);
  });

  it('keeps the socket for 30s after the last subscriber leaves, so list ↔ detail reuses it', async () => {
    vi.useFakeTimers();
    const realtime = TestBed.inject(RealtimeService);
    (await connect()).unsubscribe();
    vi.advanceTimersByTime(29_000);
    realtime.orderUpdates$.subscribe();
    http.expectNone('/api/realtime');
    expect(echoes[0].disconnect).not.toHaveBeenCalled();
  });

  it('disconnects 30s after everyone left, even when the client finished connecting late', async () => {
    vi.useFakeTimers();
    const sub = TestBed.inject(RealtimeService).orderUpdates$.subscribe();
    http.expectOne('/api/realtime').flush({ key: 'k' });
    sub.unsubscribe();
    vi.advanceTimersByTime(30_000);
    await Promise.resolve();
    expect(echoes[0].disconnect).toHaveBeenCalled();
  });

  it('reconnects with backoff after a channel subscription error', async () => {
    vi.useFakeTimers();
    await connect();
    echoes[0].failed({ error: 'network' });
    expect(echoes[0].disconnect).toHaveBeenCalled();
    vi.advanceTimersByTime(999);
    http.expectNone('/api/realtime');
    vi.advanceTimersByTime(1);
    http.expectOne('/api/realtime').flush({ key: 'k' });
    await Promise.resolve();
    echoes[1].failed({ error: 'network' });
    vi.advanceTimersByTime(1999);
    http.expectNone('/api/realtime');
    vi.advanceTimersByTime(1);
    http.expectOne('/api/realtime');
  });

  it.each([{ status: 401 }, { error: 'unauthenticated' }])(
    'stops on a 401 from channel auth (%o)',
    async (failure) => {
      vi.useFakeTimers();
      await connect();
      echoes[0].failed(failure);
      vi.advanceTimersByTime(60_000);
      http.expectNone('/api/realtime');
      expect(seen).toEqual([
        expect.objectContaining({ error: expect.objectContaining({ code: 'unauthenticated' }) }),
      ]);
    },
  );

  it('stops when the key fetch is refused with 401', () => {
    vi.useFakeTimers();
    TestBed.inject(RealtimeService).orderUpdates$.subscribe({
      error: (e: unknown) => seen.push(e as OrderUpdated),
    });
    http
      .expectOne('/api/realtime')
      .flush({ code: 'unauthenticated', message: '' }, { status: 401, statusText: 'Unauthorized' });
    vi.advanceTimersByTime(60_000);
    http.expectNone('/api/realtime');
    expect(seen).toEqual([expect.objectContaining({ code: 'unauthenticated' })]);
  });
});

describe('echoOptions', () => {
  it('reaches Reverb through nginx on 443 and authorizes through the API with the session', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const options = echoOptions('k', 'pos.local', TestBed.inject(ApiClient));
    expect(options).toMatchObject({
      wsHost: 'pos.local',
      wsPort: 443,
      wssPort: 443,
      forceTLS: true,
      enabledTransports: ['ws', 'wss'],
    });

    const callback = vi.fn();
    const auth = options.channelAuthorization;
    if (!auth || !('customHandler' in auth)) {
      throw new Error('expected a custom channel authorizer');
    }
    auth.customHandler({ socketId: '1.2', channelName: 'private-orders' }, callback);
    const req = http.expectOne('/api/broadcasting/auth');
    expect(req.request.body).toEqual({ socket_id: '1.2', channel_name: 'private-orders' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ auth: 'k:sig' });
    expect(callback).toHaveBeenCalledWith(null, { auth: 'k:sig' });

    // A refused auth hands pusher-js the API error code as the message.
    auth.customHandler({ socketId: '1.2', channelName: 'private-orders' }, callback);
    http
      .expectOne('/api/broadcasting/auth')
      .flush({ code: 'unauthenticated', message: '' }, { status: 401, statusText: 'Unauthorized' });
    expect(callback).toHaveBeenLastCalledWith(new Error('unauthenticated'), null);
  });
});

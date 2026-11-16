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
  connected: (() => void) | null = null;
  channel = '';
  disconnect = vi.fn();
  connector = {
    pusher: { connection: { bind: (_: string, cb: () => void) => (this.connected = cb) } },
  };
  constructor(readonly options: EchoOptions<'reverb'>) {}
  private(channel: string) {
    this.channel = channel;
    return {
      listen: (event: string, cb: (event: OrderUpdated) => void) => this.listeners.set(event, cb),
    };
  }
}

describe('RealtimeService', () => {
  let http: HttpTestingController;
  let echoes: FakeEcho[];

  beforeEach(() => {
    echoes = [];
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

  it('connects with the key from the API and emits order.updated on the private orders channel', async () => {
    const seen: (OrderUpdated | null)[] = [];
    const sub = TestBed.inject(RealtimeService).orderUpdates$.subscribe((e) => seen.push(e));
    http.expectOne('/api/realtime').flush({ key: 'k3y' });
    await Promise.resolve();

    const [echo] = echoes;
    expect(echo.options).toMatchObject({ broadcaster: 'reverb', key: 'k3y', forceTLS: true });
    expect(echo.channel).toBe('orders');
    echo.listeners.get('.order.updated')?.({ id: 7, version: 1 });
    echo.listeners.get('.order.updated')?.({ id: 7, version: 1 });
    expect(seen).toEqual([
      { id: 7, version: 1 },
      { id: 7, version: 1 },
    ]);

    sub.unsubscribe();
    expect(echo.disconnect).toHaveBeenCalled();
  });

  it('emits null on a reconnect but not on the first connect', async () => {
    const seen: (OrderUpdated | null)[] = [];
    TestBed.inject(RealtimeService).orderUpdates$.subscribe((e) => seen.push(e));
    http.expectOne('/api/realtime').flush({ key: 'k' });
    await Promise.resolve();
    echoes[0].connected?.();
    expect(seen).toEqual([]);
    echoes[0].connected?.();
    expect(seen).toEqual([null]);
  });

  it('shares one connection between subscribers', async () => {
    const realtime = TestBed.inject(RealtimeService);
    realtime.orderUpdates$.subscribe();
    realtime.orderUpdates$.subscribe();
    http.expectOne('/api/realtime').flush({ key: 'k' });
    expect(echoes.length).toBe(1);
  });

  it('disconnects a client that finished connecting after everyone left', async () => {
    const sub = TestBed.inject(RealtimeService).orderUpdates$.subscribe();
    http.expectOne('/api/realtime').flush({ key: 'k' });
    sub.unsubscribe();
    await Promise.resolve();
    expect(echoes[0].disconnect).toHaveBeenCalled();
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
  });
});

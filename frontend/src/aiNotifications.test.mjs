import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createNotificationScheduleId,
  pollPendingAiNotifications,
} from './aiNotifications.mjs';

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
  };
}

describe('AI custom notification delivery', () => {
  it('uses a stable positive local notification id for a backend notification', () => {
    assert.equal(
      createNotificationScheduleId('5f0b7f2e-1111-4444-9999-123456789abc'),
      createNotificationScheduleId('5f0b7f2e-1111-4444-9999-123456789abc'),
    );
    assert.ok(createNotificationScheduleId('5f0b7f2e-1111-4444-9999-123456789abc') > 0);
  });

  it('delivers pending AI notifications and marks them delivered on the server', async () => {
    const calls = [];
    const apiClient = {
      get: async (path) => {
        calls.push(['get', path]);
        return [
          {
            id: 'notification-1',
            title: 'Workout review',
            body: 'Your weekly consistency needs attention.',
            actionUrl: '/workout',
          },
        ];
      },
      patch: async (path, body) => calls.push(['patch', path, body]),
    };
    const delivered = [];

    const result = await pollPendingAiNotifications({
      apiClient,
      storage: createStorage({
        'notify:assistant': 'true',
        'notify:assistant-custom': 'true',
      }),
      deliverNotification: async (notification) => {
        delivered.push(notification);
        return true;
      },
    });

    assert.equal(result.delivered, 1);
    assert.equal(delivered[0].id, 'notification-1');
    assert.deepEqual(calls, [
      ['get', '/notifications/pending?limit=10'],
      ['patch', '/notifications/notification-1/delivered', {}],
    ]);
  });

  it('does not deliver when assistant custom notifications are disabled', async () => {
    let delivered = false;
    const result = await pollPendingAiNotifications({
      apiClient: {
        get: async () => [{ id: 'notification-1', title: 'A', body: 'B' }],
        patch: async () => {},
      },
      storage: createStorage({ 'notify:assistant-custom': 'false' }),
      deliverNotification: async () => {
        delivered = true;
        return true;
      },
    });

    assert.equal(result.delivered, 0);
    assert.equal(result.skipped, 1);
    assert.equal(delivered, false);
  });
});

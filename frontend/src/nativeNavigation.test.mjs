import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getNativeAppForPath,
  getNativeAppSwitcherOptions,
  getNativeBackDestination,
  getNativeTabsForPath,
  NATIVE_APPS,
} from './nativeNavigation.mjs';

describe('native adaptive app navigation', () => {
  it('maps routes to a selected app context', () => {
    assert.equal(getNativeAppForPath('/workout/history').id, 'training');
    assert.equal(getNativeAppForPath('/habits/settings?tab=reminders').id, 'settings');
    assert.equal(getNativeAppForPath('/finance/import').id, 'settings');
    assert.equal(getNativeAppForPath('/media/settings').id, 'settings');
    assert.equal(getNativeAppForPath('/spotify/ranking').id, 'music');
    assert.equal(getNativeAppForPath('/finance/transactions?action=new').id, 'money');
  });

  it('leaves the bottom bar to the stable global navigation', () => {
    for (const path of ['/finance', '/workout', '/habits', '/media', '/chat']) {
      assert.deepEqual(getNativeTabsForPath(path), []);
    }
  });

  it('keeps setup and import routes out of feature app definitions', () => {
    const featureAppIds = new Set(['training', 'habits', 'money', 'music', 'media']);
    for (const app of NATIVE_APPS.filter((item) => featureAppIds.has(item.id))) {
      for (const tab of app.tabs) {
        assert.equal(
          /\/import\b|\/settings\b|[?&]tab=import\b|[?&]section=/.test(tab.to),
          false,
          `${app.id} tab "${tab.label}" should not point to ${tab.to}`,
        );
      }
    }
  });

  it('keeps a selectable app layer available for all major domains', () => {
    assert.deepEqual(
      NATIVE_APPS.map((app) => app.id),
      ['overview', 'training', 'habits', 'money', 'music', 'media', 'assistant'],
    );
  });

  it('treats settings as shell chrome rather than another selectable app', () => {
    assert.equal(getNativeAppForPath('/settings').id, 'settings');
    assert.equal(NATIVE_APPS.some((app) => app.id === 'settings'), false);
    assert.equal(getNativeAppSwitcherOptions('/settings').some((app) => app.id === 'settings'), false);
    assert.equal(getNativeAppSwitcherOptions('/home').some((app) => app.id === 'settings'), false);
  });

  it('does not render a settings tabbar that duplicates the settings index', () => {
    assert.deepEqual(getNativeTabsForPath('/settings').map((tab) => tab.label), []);
    assert.deepEqual(getNativeTabsForPath('/settings?section=notifications').map((tab) => tab.label), []);
  });

  it('omits the current app from the app switcher choices', () => {
    const settingsOptions = getNativeAppSwitcherOptions('/settings');
    assert.equal(settingsOptions.some((app) => app.id === 'settings'), false);
    assert.equal(settingsOptions.some((app) => app.id === 'overview'), true);

    const overviewOptions = getNativeAppSwitcherOptions('/home');
    assert.equal(overviewOptions.some((app) => app.id === 'overview'), false);
    assert.equal(overviewOptions.some((app) => app.id === 'training'), true);
  });

  it('filters disabled feature apps from switchers and contextual tabs', () => {
    const prefs = {
      featureModules: {
        finance: { enabled: false },
        habits: { enabled: false },
        assistant: { enabled: false },
      },
    };

    assert.deepEqual(
      getNativeAppSwitcherOptions('/home', prefs).map((app) => app.id),
      ['training', 'music', 'media'],
    );
    assert.deepEqual(getNativeTabsForPath('/home', prefs), []);
    assert.deepEqual(
      getNativeAppSwitcherOptions('/settings', prefs).map((app) => app.id),
      ['overview', 'training', 'music', 'media'],
    );
  });

  it('maps Android back gestures to an in-app destination before the OS exits', () => {
    assert.equal(getNativeBackDestination('/home'), null);
    assert.equal(getNativeBackDestination('/menu'), '/home');
    assert.equal(getNativeBackDestination('/chat'), '/home');
    assert.equal(getNativeBackDestination('/settings?section=notifications'), '/settings');
    assert.equal(getNativeBackDestination('/settings'), '/home');
    assert.equal(getNativeBackDestination('/finance/transactions'), '/finance');
    assert.equal(getNativeBackDestination('/workout/history'), '/workout');
    assert.equal(getNativeBackDestination('/habits', '?view=history'), '/habits');
  });
});

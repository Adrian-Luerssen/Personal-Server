import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getNativeAppForPath,
  getNativeAppSwitcherOptions,
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

  it('shows contextual tabs for the selected app instead of one global tabbar', () => {
    assert.deepEqual(
      getNativeTabsForPath('/finance').map((tab) => tab.label),
      ['Summary', 'Transactions'],
    );
    assert.deepEqual(
      getNativeTabsForPath('/workout').map((tab) => tab.label),
      ['Today', 'Active', 'History', 'Exercises'],
    );
    assert.deepEqual(
      getNativeTabsForPath('/habits').map((tab) => tab.label),
      ['Today', 'Plan', 'History', 'Insights'],
    );
    assert.deepEqual(
      getNativeTabsForPath('/media').map((tab) => tab.label),
      ['Library'],
    );
  });

  it('keeps setup and import routes out of feature app tabbars', () => {
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
      ['overview', 'training', 'habits', 'money', 'music', 'media', 'assistant', 'settings'],
    );
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
    assert.equal(overviewOptions.some((app) => app.id === 'settings'), true);
  });
});

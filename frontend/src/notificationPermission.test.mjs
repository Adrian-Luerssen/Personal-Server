import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isPromptableNotificationPermission,
  NOTIFICATION_PERMISSION_AUTO_REQUEST_KEY,
  shouldAutoRequestNativeNotificationPermission,
} from './notificationPermission.mjs'

test('notification permission prompt states are recognized explicitly', () => {
  assert.equal(isPromptableNotificationPermission('prompt'), true)
  assert.equal(isPromptableNotificationPermission('prompt-with-rationale'), true)
  assert.equal(isPromptableNotificationPermission('granted'), false)
  assert.equal(isPromptableNotificationPermission('denied'), false)
  assert.equal(isPromptableNotificationPermission('unsupported'), false)
})

test('native app auto-requests notification permission once while permission is still promptable', () => {
  assert.equal(NOTIFICATION_PERMISSION_AUTO_REQUEST_KEY, 'personal-server-notification-permission-requested')
  assert.equal(
    shouldAutoRequestNativeNotificationPermission({
      nativeApp: true,
      alreadyAsked: false,
      permission: 'prompt',
    }),
    true,
  )
  assert.equal(
    shouldAutoRequestNativeNotificationPermission({
      nativeApp: true,
      alreadyAsked: false,
      permission: 'prompt-with-rationale',
    }),
    true,
  )
})

test('native app does not auto-request when already asked, non-native, granted, denied, or unsupported', () => {
  assert.equal(
    shouldAutoRequestNativeNotificationPermission({
      nativeApp: true,
      alreadyAsked: true,
      permission: 'prompt',
    }),
    false,
  )
  assert.equal(
    shouldAutoRequestNativeNotificationPermission({
      nativeApp: false,
      alreadyAsked: false,
      permission: 'prompt',
    }),
    false,
  )
  assert.equal(
    shouldAutoRequestNativeNotificationPermission({
      nativeApp: true,
      alreadyAsked: false,
      permission: 'granted',
    }),
    false,
  )
  assert.equal(
    shouldAutoRequestNativeNotificationPermission({
      nativeApp: true,
      alreadyAsked: false,
      permission: 'denied',
    }),
    false,
  )
  assert.equal(
    shouldAutoRequestNativeNotificationPermission({
      nativeApp: true,
      alreadyAsked: false,
      permission: 'unsupported',
    }),
    false,
  )
})

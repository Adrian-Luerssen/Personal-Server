export const NOTIFICATION_PERMISSION_AUTO_REQUEST_KEY =
  'personal-server-notification-permission-requested'

export function isPromptableNotificationPermission(permission) {
  return typeof permission === 'string' && permission.startsWith('prompt')
}

export function getNotificationActionRoute(event) {
  const extra = event?.notification?.extra || event?.notification?.data || event?.extra || {}
  const route = extra.actionUrl
  return typeof route === 'string' && route.startsWith('/') && !route.startsWith('//')
    ? route
    : null
}

export function shouldAutoRequestNativeNotificationPermission({
  nativeApp,
  alreadyAsked,
  permission,
}) {
  return (
    nativeApp === true &&
    alreadyAsked !== true &&
    isPromptableNotificationPermission(permission)
  )
}

export function normalizeNativeNotificationCapability({
  permission = 'unsupported',
  enabled = true,
  exact = 'unknown',
} = {}) {
  const displayPermission = permission || 'unsupported'
  const deviceEnabled = enabled !== false
  const exactSetting = exact || 'unknown'
  const canDisplay = displayPermission === 'granted' && deviceEnabled
  const exactAlarmBlocked = exactSetting === 'denied'

  return {
    permission: displayPermission,
    enabled: deviceEnabled,
    exact: exactSetting,
    canDisplay,
    canScheduleReminders: canDisplay && !exactAlarmBlocked,
    exactAlarmBlocked,
  }
}

export const NOTIFICATION_PERMISSION_AUTO_REQUEST_KEY =
  'personal-server-notification-permission-requested'

export function isPromptableNotificationPermission(permission) {
  return typeof permission === 'string' && permission.startsWith('prompt')
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

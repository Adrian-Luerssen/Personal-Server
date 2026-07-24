import React, { useEffect, useState } from 'react'

import {
  getApiMutationSnapshot,
  retryFailedApiMutations,
  subscribeToApiMutations,
} from '../../api'
import SyncState from './SyncState'

export default function MutationSyncState({ compact = false }) {
  const [snapshot, setSnapshot] = useState(() => getApiMutationSnapshot())

  useEffect(() => subscribeToApiMutations(setSnapshot), [])

  if (compact && snapshot.state === 'fresh') return null

  const count = snapshot.syncing + snapshot.pending
  const detail = snapshot.state === 'syncing'
    ? `Saving ${Math.max(1, count)}`
    : snapshot.state === 'queued'
      ? `${snapshot.pending} queued`
      : snapshot.state === 'failed'
        ? `${snapshot.failed} need attention`
        : 'Saved locally'

  return (
    <SyncState
      state={snapshot.state}
      detail={detail}
      onAction={() => retryFailedApiMutations()}
    />
  )
}

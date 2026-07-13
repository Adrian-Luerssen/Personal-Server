export function createNextSet(sets = []) {
  const latestCompleted = [...sets].reverse().find((set) => set?.completed)
  return {
    weight: Number(latestCompleted?.weight || 0),
    reps: Number(latestCompleted?.reps || 0),
    completed: false,
    kind: 'working',
  }
}

export function completeSetOptimistically(set) {
  const undo = { ...set }
  return {
    current: { ...set, completed: true },
    undo,
  }
}

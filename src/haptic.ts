/** A light tap where the device supports it (Android; iPhone ignores it). */
export function haptic() {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* not supported */
  }
}

/** Keep receiving a pointer's events even when it leaves the element. */
export function capture(e: { currentTarget: Element; pointerId: number }) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {
    /* the pointer is already gone */
  }
}

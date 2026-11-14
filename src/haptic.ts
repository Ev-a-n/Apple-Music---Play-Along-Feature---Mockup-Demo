/** A light tap where the device supports it (Android; iPhone ignores it). */
export function haptic() {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* not supported */
  }
}

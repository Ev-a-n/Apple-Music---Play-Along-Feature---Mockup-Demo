/// <reference types="vite/client" />

declare module 'virtual:local-audio' {
  /** Audio files found in public/audio/<song-id>/ (always empty in a build). */
  const files: Record<string, { vocals?: string; backing?: string; full?: string }>;
  export default files;
}

import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Your own audio files (public/audio/<song-id>/vocals.mp3 etc.).
 * - While developing, the app is told which files exist, so they are used.
 * - In a build, the list is empty and any audio copied into dist/ is removed,
 *   so your music can never be published by accident.
 */
function localAudio(): Plugin {
  const dir = resolve('public/audio');
  const id = '\0virtual:local-audio';
  let building = false;
  const scan = () => {
    const found: Record<string, Record<string, string>> = {};
    if (building || !existsSync(dir)) return found;
    for (const song of readdirSync(dir)) {
      if (!statSync(join(dir, song)).isDirectory()) continue;
      for (const file of readdirSync(join(dir, song))) {
        const match = /^(vocals|backing|full)\.(mp3|m4a|wav)$/i.exec(file);
        if (match) (found[song] ??= {})[match[1].toLowerCase()] = file;
      }
    }
    return found;
  };
  return {
    name: 'local-audio',
    config: (_, env) => {
      building = env.command === 'build';
    },
    resolveId: (source) => (source === 'virtual:local-audio' ? id : undefined),
    load: (source) => (source === id ? `export default ${JSON.stringify(scan())}` : undefined),
    configureServer(server) {
      const refresh = (file: string) => {
        if (!file.startsWith(dir)) return;
        const mod = server.moduleGraph.getModuleById(id);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.add(dir);
      server.watcher.on('add', refresh).on('unlink', refresh);
    },
    closeBundle() {
      const out = resolve('dist/audio');
      if (!building || !existsSync(out)) return;
      for (const entry of readdirSync(out)) if (entry !== 'README.md') rmSync(join(out, entry), { recursive: true, force: true });
    },
  };
}

// base './' makes the built site work from any sub-folder (GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react(), localAudio()],
});

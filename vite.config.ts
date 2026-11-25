import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the same build works from a web server and inside Capacitor.
  base: './',
  // Claude Code workflows put temporary git worktrees (full copies, index.html included) under
  // .claude/: changes there must not reload a running game or check.
  server: { host: true, watch: { ignored: ['**/.claude/**'] } },
  preview: { host: true },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});

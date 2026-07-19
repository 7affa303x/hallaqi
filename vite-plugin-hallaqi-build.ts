import type { Plugin } from 'vite';

/** Unique id per deploy — drives automatic client cache busting. */
export function resolveHallaqiBuildId(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
  if (sha && sha.length >= 7) return sha.slice(0, 12);
  return `dev-${Date.now().toString(36)}`;
}

export function hallaqiBuildPlugin(buildId = resolveHallaqiBuildId()): Plugin {
  return {
    name: 'hallaqi-build-id',
    config() {
      return {
        define: {
          __HALLAQI_BUILD_ID__: JSON.stringify(buildId),
        },
      };
    },
    transformIndexHtml(html) {
      const withMeta = html.includes('<!-- HALLAQI_BUILD -->')
        ? html.replace(
          '<!-- HALLAQI_BUILD -->',
          `<meta name="hallaqi-build" content="${buildId}" />`,
        )
        : html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta name="hallaqi-build" content="${buildId}" />`,
        );

      return withMeta.replace(
        /\/auth-shell\.js(\?v=[^"']*)?/,
        `/auth-shell.js?v=${buildId}`,
      );
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'build-id.json',
        source: JSON.stringify({
          id: buildId,
          builtAt: new Date().toISOString(),
        }),
      });
    },
  };
}

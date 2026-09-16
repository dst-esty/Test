import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'fetch-getter-fix',
        transformIndexHtml() {
          return [
            {
              tag: 'script',
              attrs: {},
              children: `(function() {
  try {
    var _origFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get: function() { return _origFetch; },
      set: function(val) { _origFetch = val; }
    });
  } catch(e) {
    try {
      var proto = Object.getPrototypeOf(window) || (typeof Window !== 'undefined' && Window.prototype);
      if (proto) {
        var _pFetch = proto.fetch || window.fetch;
        Object.defineProperty(proto, 'fetch', {
          configurable: true,
          enumerable: true,
          get: function() { return _pFetch; },
          set: function(val) { _pFetch = val; }
        });
      }
    } catch(e2) {}
  }
})();`,
              injectTo: 'head-prepend',
            },
          ];
        },
      },
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

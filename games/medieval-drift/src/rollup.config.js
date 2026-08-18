// rollup.config.js
const esbuild = require('esbuild');
const kontra = require('esbuild-plugin-kontra');

esbuild
  .build({
    entryPoints: ['index.js'],
    bundle: true,
    outdir: 'build',
    plugins: [
      kontra({
        gameObject: {
          // enable only velocity and rotation functionality
          velocity: true,
          rotation: true
        },
        vector: {
          // enable vector length functionality
          length: true
        },
        // turn on debugging
        debug: true
      })
    ]
  });

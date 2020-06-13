import typescript from 'rollup-plugin-typescript2';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import sourcemaps from 'rollup-plugin-sourcemaps';
import pkg from './package.json'

const rules = [
];

if (process.env.EXAMPLES) {
  rules.push(
    {
      input: 'examples/demo.ts',
      output: [
        {
          file: 'examples/build/demo.bundle.js',
          format: 'iife',
          sourcemap: true
        }
      ],
      external: [
      ],
      plugins: [
        nodeResolve({
          jsnext: true,
        }),
        commonjs({
        }),
        typescript({
          typescript: require('typescript'),
          tsconfig: 'examples/tsconfig.json'
        }),
        sourcemaps()
      ]
    }
  );
} else {
  rules.push(
    {
      input: 'src/index.ts',
      output: [
        {
          file: pkg.main,
          format: 'cjs',
        },
        {
          file: pkg.module,
          format: 'es',
        }
      ],
      external: [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.peerDependencies || {}),
      ],
      plugins: [
        typescript({
          typescript: require('typescript'),
        })
      ],
    },
  );
}

export default rules

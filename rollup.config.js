import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  external: [
    '@superset-ui/core',
    '@superset-ui/chart-controls',
    '@superset-ui/plugin-chart-echarts',
    'react',
    'react-dom',
    'echarts',
  ],
  output: [
    { file: 'dist/index.js', format: 'cjs', sourcemap: true },
    { file: 'dist/index.esm.js', format: 'esm', sourcemap: true },
  ],
  plugins: [resolve({ preferBuiltins: false }), commonjs(), json(), typescript({ tsconfig: './tsconfig.json' })],
};

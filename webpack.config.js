
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'main.js'
  },
  externals: {
    fs: 'fs',
    crypto: 'crypto',
    path: 'path'
  },
  devtool: 'inline-source-map',
  plugins: [
    new CopyWebpackPlugin([
        { from: 'src/filament/filament.wasm' },
    ])
],
};
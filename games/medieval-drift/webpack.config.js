const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Medieval Drift',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 2018, // Target ES2018 (ES9)
          compress: {
            drop_console: true, // Remove console.log statements
            drop_debugger: true, // Remove debugger statements
            collapse_vars: true, // Collapse single-use variables
            reduce_vars: true, // Reduce variables to a smaller form
          },
          output: {
            comments: false, // Remove comments
            beautify: false, // Pretty-print code
          },
        },
      }),
    ],
  },
  target: 'web', // Target modern browsers
};

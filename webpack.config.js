const path = require("path");

const SOURCE_PATH = "src/";
const BUILD_PATH = "build/";

module.exports = {
  entry: {
    client: path.resolve(SOURCE_PATH, "client/client.ts"),
    server: path.resolve(SOURCE_PATH, "server/server.ts"),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ['ts-loader', 'eslint-loader'],
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [],
  optimization: {
    minimize: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    path: path.resolve(BUILD_PATH),
    filename: '[name].js'
  },
};
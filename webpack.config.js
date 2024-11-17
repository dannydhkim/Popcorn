const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")

module.exports = {
  entry: {
    background: './src/background.js',
    content: './src/content.js',
    popup: './src/popup.js',
    sidebar: './src/sidebar.jsx',  
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js', // Will output background.js in dist/
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,   // Transpile .js and .jsx files using Babel
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,    // Handle CSS files
        use: [
          {
            // We configure 'MiniCssExtractPlugin'
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: "css-loader",
            options: {
              modules: {
                exportLocalsConvention: "camelCaseOnly",
                namedExport: true,
              },
              sourceMap: true,
              importLoaders: 1,
            },
          },
          {
            // PostCSS will run before css-loader and will
            // minify and autoprefix our CSS rules.
            loader: "postcss-loader",
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i, // Handle image files
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext]', // Output to images folder
        },
      },
    ],
  },
  plugins: [
      new HtmlWebpackPlugin({
        template: './src/sidebar.html',
        filename: 'sidebar.html',
        chunks: ['sidebar'],
      }),
  
      // Create the stylesheet under 'styles' directory
      new MiniCssExtractPlugin({
        filename: "styles/styles.[hash].css",
      }),
    ],
  resolve: {
    extensions: ['.js', '.jsx']
  }
};
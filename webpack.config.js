const path = require("node:path");
const TerserPlugin = require("terser-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	mode: "production",
	entry: "./src/index.tsx",
	output: {
		filename: "main.min.js",
		path: `${__dirname}/dist`,
		library: "ReactStableFluids",
		libraryTarget: "umd",
		globalObject: "this",
	},
	module: {
		rules: [
			{
				test: /\.(j|t)sx?$/,
				exclude: /node_modules/,
				use: [
					{
						loader: "babel-loader",
						options: {
							presets: [["@babel/preset-env", { modules: false }]],
						},
					},
				],
			},
			{
				test: /\.(vert|frag|obj)$/i,
				use: "raw-loader",
			},
		],
	},
	resolve: {
		extensions: [".js", ".jsx", ".ts", ".tsx"],
	},
	externals: {
		react: {
			commonjs: "react",
			commonjs2: "react",
			amd: "React",
			root: "React",
		},
		"react-dom": {
			commonjs: "react-dom",
			commonjs2: "react-dom",
			amd: "ReactDOM",
			root: "ReactDOM",
		},
		three: {
			commonjs: "three",
			commonjs2: "three",
			amd: "Three",
			root: "Three",
		},
		"@react-three/fiber": {
			commonjs: "@react-three/fiber",
			commonjs2: "@react-three/fiber",
			amd: "ReactThreeFiber",
			root: "ReactThreeFiber",
		},
	},
	optimization: {
		minimize: true,
		minimizer: [
			new TerserPlugin({
				test: /\.js(\?.*)?$/i,
			}),
		],
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: "./src/test.html",
		}),
	],
	devServer: {
		static: {
			directory: path.join(__dirname, "dist"),
		},
		compress: false,
		open: true,
		port: 3001,
		host: "0.0.0.0",
		hot: true,
		allowedHosts: "all",
	},

	devtool: "inline-source-map",
};

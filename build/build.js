var fs = require('fs')
var path = require('path')
var zlib = require('zlib')
var rollup = require('rollup')
var uglify = require('uglify-js')
var babel = require('rollup-plugin-babel')
var replace = require('rollup-plugin-replace')
var package = require('../package.json')
var name = package.name
var mainPath = resolvePath('../src/index.js')

const moduleName = name.replace(/-([a-z])/g, ($0, $1) => $1.toUpperCase())
const banner = `/*!
 * ${name} v${package.version}
 * (c) ${new Date().getFullYear()} ${package.author}
 * Released under the ${package.license} License.
 */
`
// common js
rollup.rollup({
	entry: mainPath,
	plugins: [
		babel({
			exclude: 'node_modules/**'
		})
	]
}).then((bundle) => {
	console.log(yellow('start building'))
	return write(resolvePath(`../dist/${name}.common.js`), bundle.generate({
		format: 'cjs',
		banner: banner
	}).code)
}).then(() => {
	return rollup.rollup({
		entry: mainPath,
		plugins: [
			replace({
				'process.env.NODE_ENV': JSON.stringify('development')
			}),
			babel()
		]
	}).then((bundle) => {
		return write(resolvePath(`../dist/${name}.js`), bundle.generate({
			format: 'umd',
			banner: banner,
			moduleName: moduleName
		}).code)
	})
}).then(function() {
	return rollup.rollup({
		entry: mainPath,
		plugins: [
			replace({
				'process.env.NODE_ENV': JSON.stringify('production')
			}),
			babel()
		]
	}).then((bundle) => {
		var code = bundle.generate({
			format: 'umd',
			moduleName: moduleName,
			banner: banner
		}).code
		var res = uglify.minify(code, {
			fromString: true,
			outSourceMap: `${name}.min.js.map`,
			output: {
				preamble: banner,
				ascii_only: true
			}
		})
		// fix uglifyjs sourcemap
		var map = JSON.parse(res.map)
		map.sources = [`${name}.js`]
		map.sourcesContent = [code]
		map.file = `${name}.min.js`
		return [
			write(resolvePath(`../dist/${name}.min.js`), res.code),
			write(resolvePath(`../dist/${name}.min.js.map`), JSON.stringify(map))
		]
	})
}).catch(logError)

// htmlMin('./demo/index.html', './dist/index.html')

function resolvePath(_path) {
	return path.resolve(__dirname, _path)
}

function write(dest, code) {
	return new Promise(function(resolve, reject) {
		fs.writeFile(dest, code, function(err) {
			if(err) return reject(err)
			console.log(blue(dest) + ' ' + getSize(code))
			resolve()
		})
	})
}

function zip() {
	return new Promise(function(resolve, reject) {
		fs.readFile(`dist/${name}.min.js`, function(err, buf) {
			if(err) return reject(err)
			zlib.gzip(buf, function(err, buf) {
				if(err) return reject(err)
				write(`dist/${name}.min.js.gz`, buf).then(resolve)
			})
		})
	})
}

function getSize(code) {
	return (code.length / 1024).toFixed(2) + 'kb'
}

function logError(e) {
	console.log(e.stack)
}

function blue(str) {
	return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m'
}
function yellow(str) {
	return '\x1b[1m\x1b[33m' + str + '\x1b[39m\x1b[22m'
}

function htmlMin(src, target) {
	var html = fs.readFileSync(src, 'utf-8')
	var result = htmlMinify(html, {
		removeAttributeQuotes: true,
		minifyCSS: true,
		minifyJS: true,
		"collapseBooleanAttributes": true,
		"collapseWhitespace": true,
		"decodeEntities": true,
		
		"html5": true,
		"processConditionalComments": true,
		"processScripts": [
			"text/html"
		],
		"removeComments": true,
		"removeEmptyAttributes": true,
		"removeOptionalTags": true,
		"removeyellowundantAttributes": true,
		"removeScriptTypeAttributes": true,
		"removeStyleLinkTypeAttributes": true,
		"removeTagWhitespace": true,
		"useShortDoctype": true
	})
	
	write(target, result)
}

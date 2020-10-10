const gulp = require("gulp"),
	path = require("path"),
	sourcemaps = require("gulp-sourcemaps"),
	del = require('del'),
	gulpTs = require('gulp-typescript'),
	gulpRename = require('gulp-rename'),
	tsProject = gulpTs.createProject('tsconfig.json'),

	mocha = require('gulp-mocha')
;

const TS_FILES = [
	'src/**/*.ts',
	'!src/**/*.d.ts',
];





/**
 *
 * @param {stream.Readable} stream
 * @return {Promise<unknown>}
 */
function streamToPromise(stream) {
	return new Promise(function (resolve, reject) {
		stream
			.on('finish', resolve)
			.on('error', reject)
	})
}

function clearJs() {
	return del([
		'src/**/*.js',
		'src/**/*.cjs',
		'src/**/*.mjs',
		'src/**/*.d.ts',
		'src/**/*.map',
	]);
}

function js() {
	const tsResult = gulp.src(TS_FILES)
		.pipe(sourcemaps.init())
		.pipe(tsProject())
	;

	return Promise.all([
		streamToPromise(
			tsResult.dts.pipe(gulp.dest('src'))
		),
		streamToPromise(
			tsResult.js
				.pipe(gulpRename(path => {
					path.extname = ".mjs";
				}))
				.pipe(sourcemaps.write('.'))
				.pipe(gulp.dest('src'))
		)
	]);
}

exports.js = gulp.series(clearJs, js);





function jsTest() {
	return gulp.src(['test/**/*.js'], {read: false})
		.pipe(mocha())
	;
}





function watch() {
	gulp.watch(
		TS_FILES,
		{
			ignoreInitial: false,
			delay: 500
		},
		function jsNoDts() {
			return gulp.src(TS_FILES)
				.pipe(sourcemaps.init())
				.pipe(tsProject()).js
				.pipe(sourcemaps.write('.'))
				.pipe(gulp.dest('src'))
		}
	);
}





const clear = gulp.series(clearJs),
	build = gulp.series(clear, js)
;

exports.clear = clear;
exports.build = build;
exports.test = jsTest;
exports.watch = gulp.series(clear, watch);
exports.default = build;

import gulp from "gulp";
import sourcemaps from "gulp-sourcemaps";
import del from "del";
import gulpTs from "gulp-typescript";
import mocha from "gulp-mocha";

const tsProject = gulpTs.createProject('tsconfig.json');
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

function _js() {
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
				/*.pipe(gulpRename(path => {
					path.extname = ".mjs";
				}))*/
				.pipe(sourcemaps.write('.'))
				.pipe(gulp.dest('src'))
		)
	]);
}

export const js = gulp.series(clearJs, _js);





function jsTest() {
	return gulp.src(['test/**/*.js'], {read: false})
		.pipe(mocha())
	;
}





function _watch() {
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





export const clear = gulp.series(clearJs);
export const build = gulp.series(clear, _js);
export const test = jsTest;
export const watch = gulp.series(clear, _watch);
export default build;

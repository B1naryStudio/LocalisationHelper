var gulp = require('gulp');
var jade = require('gulp-jade');
var stylus = require('gulp-stylus');
var nib = require('nib');

gulp.task('stylus', function() {	
	gulp.src('./public/styl/*.styl')
		.pipe(stylus({
				use: nib(),
				compress: true
			}))
		.pipe(gulp.dest('./public/css/'));
});

gulp.task('jade', function() {
	gulp.src('./public/index2.jade')
		.pipe(jade())
		.pipe(gulp.dest('./public/'));
});

gulp.task('default', function() {
	gulp.run('stylus');
	gulp.run('jade');
});

gulp.task('watch', function() {
	gulp.run('stylus');
	gulp.run('jade');

	gulp.watch('./public/styl/*.styl', function() {
		gulp.run('stylus');
	});
	gulp.watch(['./public/index2.jade', './public/templates/*.jade'], function() {
		gulp.run('jade');
	});
});
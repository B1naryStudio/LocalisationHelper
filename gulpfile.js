var gulp = require('gulp');
var jade = require('gulp-jade');

gulp.task('default', function() {
	gulp.src('./index2.jade')
		.pipe(jade({
			client: true
		}))
		.pipe(gulp.dest('./'));
});
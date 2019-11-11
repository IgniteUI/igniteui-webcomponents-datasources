var gulp = require('gulp');
var del = require('del');
var flatten = require('gulp-flatten');
var replace = require('gulp-replace');
var exec = require('child_process').exec;
var runSequence = require('gulp-run-sequence');

var fileRoot = '../../';

var packages = [
    ["igniteui-core", "igniteui-webcomponents-core"],
    ["igniteui-charts", "igniteui-webcomponents-charts"],
    ["igniteui-gauges", "igniteui-webcomponents-gauges"],
    ["igniteui-grids", "igniteui-webcomponents-grids"],
    ["igniteui-datasources", "igniteui-webcomponents-datasources"]
];

gulp.task('clean:copyES5', function() {
    return del.sync([
        "tmp/ES5/**/*.*"
    ]);
});

gulp.task('copyES5', ['clean:copyES5'], function(done) {
    return gulp.src([
        "src/**/*.*"
    ])
    .pipe(gulp.dest("tmp/ES5", { mode: "0777" }))
});

gulp.task('clean:copyES2015', function() {
    return del.sync([
        "tmp/ES2015/**/*.*"
    ]);
});

gulp.task('copyES2015', ['clean:copyES5'], function(done) {
    return gulp.src([
        "src/**/*.*"
    ])
    .pipe(gulp.dest("tmp/ES2015", { mode: "0777" }))
});

gulp.task('clean:buildES5', function() {
    for (var i = 0; i < packages.length; i++) {
        del.sync("dist/" + packages[i][1] + "/ES5/**/*.*");
        del.sync("dist/" + packages[i][1] + "ES5");
    } 
    del.sync("dist/ES5/**/*.*");
    return del.sync("dist/ES5");
});

gulp.task('clean:buildES2015', function() {
    for (var i = 0; i < packages.length; i++) {
        del.sync("dist/" + packages[i][1] + "/ES2015/**/*.*");
        del.sync("dist/" + packages[i][1] + "ES2015");
    } 
    del.sync("dist/ES2015/**/*.*");
    return del.sync("dist/ES2015");
});

function buildProduct(callback, lang) {
    var continuation = function (i) {
        if (i > packages.length - 1) {
            exec("npm run compile" + lang, function (err, stdout, stderr) {
                console.log(stdout, stderr);

                if (err) {
                    console.log("error");
                    callback(err);
                    return;
                }

                var continuation2 = function (j) {
                    if (j > packages.length - 1) {
                        del.sync("dist/" + lang + "/**/*.*");
                        del.sync("dist/" + lang);

                        callback(err);
                    } else {
                        gulp.src([
                            'dist/' + lang + '/' + packages[j][0] + '**/*.*'
                        ])
                        .pipe(flatten())
                        .pipe(gulp.dest('dist/' + packages[j][1] + '/' + lang))
                        .on("end", function (cb) {
                            continuation2(j + 1);
                        })
                        .on("error", function (err) {
                            callback(err);
                        });
                    }
                }
                continuation2(0);
            });
        } else {
            var reg = '^import\\s+{([^}]*)}\\s+from\\s+[\'"]' + packages[i][0] + '\\/(\\S*)[\'"]';
            console.log(reg);
            var regEx = new RegExp(reg, "gm");
            gulp.src([
              'tmp/' + lang + '/**/*.ts',
              'tmp/' + lang + '/**/*.tsx'
            ])
            .pipe(replace(regEx,'import {$1} from "' + packages[i][1] + '/' + lang + '/$2"'))
            .pipe(gulp.dest("tmp/" + lang))
            .on("end", function () { continuation(i + 1) })
            .on("error", function (err) { callback(err) });
        }
    }
    continuation(0);
}

gulp.task('buildES5', ['copyES5', 'clean:buildES5'], function(callback) {
    buildProduct(callback, "ES5");
});

gulp.task('buildES2015', ['copyES2015', 'clean:buildES2015'], function(callback) {
    buildProduct(callback, "ES2015");
});

gulp.task('build', function(done) {
   runSequence('buildES5', 'buildES2015');
});

var elixir = require('laravel-elixir');

elixir(function(mix) {
    mix.rubySass('site.scss');
    mix.browserify('site.js', './public/js/site.js', 'resources/assets/js');

    // mix.copy('resources/assets/bower_components/jquery/dist/jquery.js', 'public/vendor/jquery.js');
    mix.copy('resources/assets/bower_components/jqlite/jqlite.1.1.1.min.js', 'public/vendor/jquery.js');
    mix.copy('resources/assets/bower_components/angular/angular.min.js', 'public/vendor/angular.js');
    mix.copy('resources/assets/bower_components/modernizr/modernizr.js', 'public/vendor/modernizr.js');
    mix.copy('resources/assets/bower_components/normalize.css/normalize.css', 'public/vendor/normalize.css');

    //version files
    mix.version(['css/site.css', 'js/site.js']);
});

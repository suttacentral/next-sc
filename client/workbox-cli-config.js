module.exports = {
    'swDest': './build/default/sw-generated.js',
    'globDirectory': './build/default/',
    'globPatterns': [
        '/',
        'index.html',
        'manifest.json',
        '**/*.js',
        '**/*.html',
        '**/*.json',
        'img/**/*',
        'img/home-page/**/*',
        'img/static-pages/**/*',
        'files/fonts/**/*.woff2'
    ],
    'globIgnores': 'bower_components/webcomponentsjs/*'
};

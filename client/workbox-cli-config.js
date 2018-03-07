module.exports = {
    'swSrc': './build/default/service-worker.js',
    'swDest': './build/default/sw-generated.js',
    'globDirectory': './build/default/',
    'globPatterns': [
        '/',
        'index.html',
        'manifest.json',
        '**/*.js',
        'elements/**/*.html',
        'elements/**/*.json',
        'localization/**/en.json',
        'img/home-page/**/*',
        'img/static-pages/**/*',
        'img/pray.png',
        'img/*.svg',
        'files/fonts/SkolarPE-Bold_3.005.woff2',
        'files/fonts/SkolarPE-Regular_3.005.woff2',
        'files/fonts/SkolarSansPE-Bd_2.001.woff2',
        'files/fonts/SkolarSansPE-It_2.001.woff2',
        'files/fonts/SkolarSansPE-Rg_2.001.woff2'
    ],
    'globIgnores': [
        'bower_components/webcomponentsjs/*',
        'elements/static-templates/*'
    ]
};

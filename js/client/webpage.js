/*global KINOME module google Blob jQuery save ID $ window*/
(function (exports) {
    "use strict";

    var $page;
    var baseURL = 'http://db.kinomecore.com/1.0.0/name';

    $page = KINOME.page;
    $page.empty();

    if (KINOME.params.data.length === 0) {
        $page.append('<div class="text-center alert alert-info"><h2>We noticed you do not have any data loaded, we are starting the page with our public database, please wait...</h2></div>');
        KINOME.loadData(baseURL).then(function () {
            return KINOME.loadData('local://name');
        }).then(function () {
            return require('name');
        });
    } else {
        //load UI scripts that correspond to types
        KINOME.list('levels').map(function (x) {
            return require(x, 'js').catch(function (err) {
                KINOME.error(err, 'No default options for level: ' + x);
            });
        });
    }

    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
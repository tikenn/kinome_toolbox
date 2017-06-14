/*global KINOME module google Blob jQuery save ID $ window*/

(function (exports) {
    "use strict";

    var $page;

    $page = KINOME.page;
    $page.empty();

    if (KINOME.params.data.length === 0) {
        $page.append('<div class="text-center alert alert-info"><h2>We noticed you do not have any data loaded, we are starting the page with our public database, please wait...</h2></div>');
        KINOME.loadData('http://138.26.31.155:8000/db/kinome/names').then(function () {
            return require('set_up_table');
        });
    } else {
        //Find types and load in possible packages
        var types = {};
        KINOME.params.data.map(function (x) {
            return x.value;
        }).reduce(function (a, b) {
            return a.concat(b);
        }).map(function (x) {
            types[x.level] = 1; //update to type in future
            return x;
        });

        //load UI scripts that correspond to types
        Object.keys(types).map(function (x) {
            return require({type: x});
        });
    }


    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
/*global amd_ww, KINOME module google Blob jQuery save ID $ window*/

(function (exports) {
    "use strict";
    /*
        The point of this is to run the quality filtration package. We will
        see how it goes.
    */
    var div, buildPage, requires, fitCurvesWorker, equationURL, startFits, non_linear_model;

    fitCurvesWorker = "./js/lib/fitCurvesWorker.min.js";
    equationURL = "./models/cyclingEq_3p_hyperbolic.json";

    requires = [KINOME.loadStrings(equationURL), require('amd_ww'), require('enrich_kinome'), require('outlier')];

    buildPage = function (req_arr) {
        non_linear_model = req_arr[0].replace(/\/\/[^\n]*/g, "").replace(/\s+/g, ' ');
        div.append('<div>This script fits all of the level 1.0.0 curves, linear first, to detect outliers. If applicable it will add in cycle slopes to fit for the non-linear fits. If not then that will be skipped. This can take several minutes to run and is not designed for more than 40 samples at a time (For that please use the command line interface). Once you start the fitting, two loading bars will appear. When they are complete you will be able to see what points have been removed, look at the fits and link to the appropriate images.<div>');
        $('<button>', {style: "margin: 15px;", class: "btn btn-primary btn-lg", text: "Begin Fits."}).click(startFits).appendTo($('<div>', {class: 'text-center'}).appendTo(div));
    };

    startFits = function (evt) {
        evt.preventDefault();
        var data, barBuilder, filterPromise;
        data = KINOME.get({level: '1.0.0'});

        barBuilder = function (msg) {
            div.append('<div>', {text: msg});
            var bar = $('<div>', {
                class: "progress-bar",
                role: "progressbar",
                'aria-valuenow': "0",
                "aria-valuemin": "0",
                "aria-valuemax": "100",
                style: "width: 0%"
            }).appendTo($('<div class="progress"></div>').appendTo(div));
            return function (counts) {
                var interval, percent;
                interval = setInterval(function () {
                    if (counts.done === counts.total) {
                        clearInterval(interval);
                    }
                    percent = counts.done / counts.total * 100;
                    percent = percent.toFixed(2);
                    bar.attr('aria-valuenow', percent);
                    bar.attr('style', "width: " + percent + "%");
                    bar.text(percent + "%");
                }, 100);
            };
        };

        filterPromise = KINOME.filter({
            data: data,
            amd_ww: amd_ww,
            equation: non_linear_model,
            worker: fitCurvesWorker,
            number_threads: 4,
            linearUpdate: barBuilder('Linear Fits'),
            kineticUpdate: barBuilder('Kinetic Fits')
        });

        filterPromise.then(function (data) {
            console.log('all fit?', data);
        });
    };

    //Finally get things started
    (function () {
        //Actually set up page elements
        div = KINOME.addAnalysis('Find Outliers');

        //Now require scripts then get going.
        Promise.all(requires).then(buildPage);
    }());

    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
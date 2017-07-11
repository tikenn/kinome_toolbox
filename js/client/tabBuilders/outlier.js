/*global amd_ww, KINOME module google Blob jQuery save ID $ window*/
(function (exports) {
    "use strict";
    /*
        The point of this is to run the quality filtration package. We will
        see how it goes.
    */
    var DIV, buildPage, fitCurvesWorker, equationURL, startFits, displayData, non_linear_model;

    fitCurvesWorker = "./js/lib/fitCurvesWorker.min.js";
    equationURL = "./models/cyclingEq_3p_hyperbolic.jseq";

    var eqProm = require(equationURL, 'text');
    require('amd_ww');
    require('enrich_kinome');
    require('outlier');
    require('level_1_display');

    buildPage = function (equation) {
        non_linear_model = equation.replace(/\/\/[^\n]*/g, "").replace(/\s+/g, ' ');
        DIV.append('<div>This script fits all of the level 1.0.0 curves, linear first, to detect outliers. If applicable it will add in cycle slopes to fit for the non-linear fits. If not then that will be skipped. This can take several minutes to run and is not designed for more than 40 samples at a time (For that please use the command line interface). Once you start the fitting, two loading bars will appear. When they are complete you will be able to see what points have been removed, look at the fits with link to the appropriate images. The resultant array will be colored by the number of outliers per spot.<div>');
        $('<button>', {style: "margin: 15px;", class: "btn btn-primary btn-lg", text: "Begin Fits."}).click(startFits).appendTo($('<div>', {class: 'text-center'}).appendTo(DIV));
    };

    startFits = function (evt) {
        evt.preventDefault();
        var data, barBuilder, filterPromise;
        data = KINOME.get({level: '1.0.0'});

        barBuilder = function (msg) {
            DIV.append('<div>', {text: msg});
            var bar = $('<div>', {
                class: "progress-bar",
                role: "progressbar",
                'aria-valuenow': "0",
                "aria-valuemin": "0",
                "aria-valuemax": "100",
                style: "width: 0%"
            }).appendTo($('<div class="progress"></div>').appendTo(DIV));
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
            displayData(data);
            // console.log('all fit?', data);
        });
    };

    displayData = function (outlier_removed) {
        // var options = {}, selected = {};
        // var samps = DATA.list('names');

        // $page_build.img_picker = $('<div>', {class: 'row'});
        // $page_build.samp_picker = $('<input>', {class: 'form-control'});
        // $
        var lvl1Disp = KINOME.levelOneDisplay(outlier_removed);

        lvl1Disp.setColorFunc(function (peptides, state) {
            var i, j, max = -Infinity, obj, min = Infinity, kineticD, linearD, count, values = [];
            for (i = 0; i < peptides.length; i += 1) {
                count = 0;
                // console.log(peptides[i]);
                kineticD = state.sample.get({peptide: peptides[i].peptide, exposure: peptides[i].exposure});
                linearD = state.sample.get({peptide: peptides[i].peptide, cycle: peptides[i].cycle});
                for (j = 0; j < kineticD.length; j += 1) {
                    obj = kineticD[j];
                    if (obj.hasOwnProperty("signal_valid") && !obj.signal_valid) {
                        count += 1;
                    }
                    if (obj.hasOwnProperty("background_valid") && !obj.background_valid) {
                        count += 1;
                    }
                }
                for (j = 0; j < linearD.length; j += 1) {
                    obj = linearD[j];
                    if (obj.hasOwnProperty("signal_valid") && !obj.signal_valid) {
                        count += 1;
                    }
                    if (obj.hasOwnProperty("background_valid") && !obj.background_valid) {
                        count += 1;
                    }
                }
                max = Math.max(max, count);
                min = Math.min(min, count);
                values.push(count);
            }
            return Promise.resolve(values.map(function (x) {
                return (x - min) / (max - min);
            }));

        });

        DIV.append(lvl1Disp);

    };

    //Finally get things started
    DIV = KINOME.addAnalysis('Find Outliers');
    require(function () {
        //Actually set up page elements
        eqProm.then(buildPage);
    });

    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
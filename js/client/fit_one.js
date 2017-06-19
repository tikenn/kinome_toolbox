/*global KINOME, amd_ww*/
(function (exports) {
    'use strict';

    var get_models, eq_string, worker, fitCurvesWorker, equationURL, requires;

    fitCurvesWorker = "./js/lib/fitCurvesWorker.min.js";
    equationURL = "./models/cyclingEq_3p_hyperbolic.jseq";

    requires = [require(equationURL, 'text'), require('amd_ww')];
    requires = Promise.all(requires);


    get_models = function (array, cycVexp) {
        var i = 0, background = {
            x: [],
            y: [],
            valid: [],
            equation: {string: eq_string}
        }, signal = {
            x: [],
            y: [],
            valid: [],
            equation: {string: eq_string}
        };
        for (i = 0; i < array.length; i += 1) {
            //signal
            signal.x.push(array[i][cycVexp]);
            signal.y.push(array[i].signal);
            signal.valid.push(array[i].signal_valid);
            //background
            background.x.push(array[i][cycVexp]);
            background.y.push(array[i].background);
            background.valid.push(array[i].background_valid);
        }
        return {
            signal: signal,
            background: background
        };
    };

    requires.then(function (res) {
        eq_string = res[0].replace(/\/\/[^\n]*/g, "").replace(/\s+/g, ' ');
        worker = amd_ww.start({
            filename: fitCurvesWorker,
            num_workers: 4
        });
        return;
    });

    exports.fit = function (dataArr, type) {
        return new Promise(function (resolve, reject) {
            if (typeof type !== 'string' || (type !== 'linear' && type !== 'kinetic')) {
                reject('You must pass in a type of either linear or kinetic');
            }
            if (!Array.isArray(dataArr) || dataArr.length < 2) {
                reject('You must pass in a data array of at least length 2.');
            }
            requires.then(function () {
                var model, p1, p2;

                if (type === 'kinetic') {
                    model = get_models(dataArr, 'cycle');
                } else {
                    model = get_models(dataArr, 'exposure');
                }
                p1 = worker.submit({
                    model: model.signal,
                    origin: {type: 'signal'}
                });
                p2 = worker.submit({
                    model: model.signal,
                    origin: {type: 'background'}
                });

                Promise.all([p1, p2]).then(function (res) {
                    resolve({
                        signal: res[0][1],
                        background: res[1][1]
                    });
                });
            });
        });
    };


    return [get_models];
}(KINOME));
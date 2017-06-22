/*global KINOME, amd_ww*/
(function (exports) {
    'use strict';

    var get_models, eq_string, worker, fitCurvesWorker, equationURL, requires;

    fitCurvesWorker = "./js/lib/fitCurvesWorker.min.js";
    equationURL = "./models/cyclingEq_3p_hyperbolic.jseq";

    requires = [require(equationURL, 'text'), require('amd_ww')];
    requires = Promise.all(requires);


    get_models = function (array, cycVexp, equation) {
        var i = 0, background = {
            x: [],
            y: [],
            valid: [],
            // equation: {string: equation, robust: true}
            equation: {string: equation}
        }, signal = {
            x: [],
            y: [],
            valid: [],
            // equation: {string: equation, robust: true}
            equation: {string: equation}
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

    exports.fit = function (dataArr, type, backvsig) {
        return new Promise(function (resolve, reject) {
            if (typeof type !== 'string' || (type !== 'linear' && type !== 'kinetic')) {
                reject('You must pass in a type of either linear or kinetic');
            }
            if (!Array.isArray(dataArr) || dataArr.length < 2) {
                reject('You must pass in a data array of at least length 2.');
            }
            requires.then(function () {
                var model, p1, p2, outObj = {};

                if (type === 'kinetic') {
                    model = get_models(dataArr, 'cycle', eq_string);
                    eval("outObj.equation =" + eq_string);
                } else {
                    model = get_models(dataArr, 'exposure', 'linear');
                    outObj.equation = {
                        description: "For fitting linear data",
                        displayEq: function (params) {
                            return 'y(e)=' + params[0].toFixed(2) + '·e+' + params[1].toFixed(2);
                        },
                        func: function (X, p) {
                            return X[0] * p[0] + p[1];
                        },
                        mathParams: ['m', 'b'],
                        mathType: 'y(e)=m·e+b',
                        name: 'linear',
                        stringified: "y(e) = m · e + b"
                    };
                }

                //Only fit requested if asked for
                if (backvsig !== undefined && backvsig === 'signal') {
                    p1 = worker.submit({
                        model: model.signal,
                        origin: {type: 'signal'}
                    });
                    p2 = Promise.resolve();
                } else if (backvsig !== undefined && backvsig === 'background') {
                    p1 = Promise.resolve();
                    p2 = worker.submit({
                        model: model.background,
                        origin: {type: 'background'}
                    });
                } else {
                    p1 = worker.submit({
                        model: model.signal,
                        origin: {type: 'signal'}
                    });
                    p2 = worker.submit({
                        model: model.background,
                        origin: {type: 'background'}
                    });
                }

                Promise.all([p1, p2]).then(function (res) {
                    if (Array.isArray(res[0])) {
                        outObj.signal = res[0][1];
                    }
                    if (Array.isArray(res[1])) {
                        outObj.background = res[1][1];
                    }
                    resolve(outObj);
                });
            });
        });
    };


    return [get_models];
}(KINOME));
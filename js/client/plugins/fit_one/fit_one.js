/*global KINOME, window, amd_ww*/
(function (exports) {
    'use strict';

    var get_models, eq_string, worker, fitCurvesWorker, equationURL, amd_ww2, requires;

    fitCurvesWorker = "./js/lib/fitCurvesWorker.min.js";
    equationURL = "./models/cyclingEq_3p_hyperbolic.jseq";


    //There are better ways of doing this, but to get it node ready quickly...
    if ("undefined" !== typeof module && module.exports) {
        amd_ww2 = require('amd_ww').amd_ww;
        var fs = require('fs');
        requires = new Promise(function (resolve, reject) {
            fs.readFile(equationURL, 'utf8', function (err3, equation) {
                if (err3) {
                    reject('failed to get equation');
                }
                resolve([equation]);
            });
        });
    } else {
        //in browser
        requires = [require(equationURL, 'text'), require('amd_ww')];
        requires = Promise.all(requires);
    }



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
        if (typeof window !== 'undefined' && window.amd_ww) {
            amd_ww2 = window.amd_ww;
        }
        eq_string = res[0].replace(/\/\/[^\n]*/g, "").replace(/\s+/g, ' ');
        worker = amd_ww2.start({
            filename: fitCurvesWorker,
            num_workers: 4
        });
        return;
    }).catch(function (err) {
        console.error(err);
    });

    exports.fit = function (dataArr, type, backvsig, passback) {
        return new Promise(function (resolve, reject) {
            var short = false;
            if (typeof type !== 'string' || (type !== 'linear' && type !== 'kinetic')) {
                reject('You must pass in a type of either linear or kinetic');
                return;
            }
            if (!Array.isArray(dataArr) || dataArr.length < 2) {
                short = true;
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

                //short
                if (short) {
                    outObj.signal = {
                        R2: NaN,
                        parameters: outObj.equation.mathParams.map(function () {
                            return NaN;
                        })
                    };
                    outObj.background = {
                        R2: NaN,
                        parameters: outObj.equation.mathParams.map(function () {
                            return NaN;
                        })
                    };
                    resolve(outObj);
                    return;
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
                    outObj.passback = passback;
                    resolve(outObj);
                });
            });
        }).catch(function (err) {
            console.error(err);
        });
    };

}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
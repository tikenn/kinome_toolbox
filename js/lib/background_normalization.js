/*global KINOME*/

(function (exports) {
    "use strict";
    /*

        The purpose of this function is to take in a number of data objects and
        apply the transformation to the background. This is done on an image by
        image basis.

    */
    // variable declarations
    var main, shiftToMin, normalize_background;

    //Should allow this to run in both situations
    var tempFitOne = require('fit');
    if (tempFitOne.hasOwnProperty('fit')) {
        tempFitOne = tempFitOne.fit;
    } else {
        tempFitOne.then(function () {
            tempFitOne = KINOME.fit;
        });
    }

    var fitOne = (function () {
        var savedFits = {};
        return function (dataObj, spec, peptide, type, sigVback, passback) {
            var key = dataObj.name + type + spec + peptide + sigVback, thisD, thisG;
            // var saved = true;
            if (!savedFits[key]) {
                // saved = false;
                thisG = {
                    peptide: peptide
                };
                if (type === 'linear') {
                    thisG.cycle = spec;
                } else {
                    thisG.exposure = spec;
                }
                thisD = dataObj.get(thisG);
                savedFits[key] = tempFitOne(thisD, type, sigVback).then(function (res) {
                    //remember minimum stuff
                    var thisRes = {};
                    thisRes[sigVback] = {
                        R2: res[sigVback].R2,
                        parameters: res[sigVback].parameters
                    };
                    thisRes.equation = {
                        func: res.equation.func
                    };
                    return thisRes;
                });
                thisD = [];
            }
            // console.log(passback * 1, saved, key, Math.random());
            return savedFits[key].then(function (res) {
                res.passback = passback;
                return res;
            });
        };
    }());

    var getFits = function (data, peptideObj, sigVback) {
        var i,
            good,
            promises = [],
            cycle = peptideObj.cycle,
            peptide = peptideObj.peptide,
            exposure = peptideObj.exposure,
            forLinear = data.get({cycle: cycle, peptide: peptide}),
            forNonLinear;

        // console.log('getting fit', cycle, exposure, forLinear, forNonLinear, peptide);
        // console.log('geting fit', cycle, exposure, forLinear, forNonLinear);

        // Promise.resolve(NaN);
        // return;

        //check to see if linear is worth it
        good = 0;
        for (i = 0; i < forLinear.length; i += 1) {
            good += forLinear[i][sigVback + '_valid'] * 1;
        }
        //Empty, no longer needed
        forLinear = [];

        if (good > 1) {
            promises[0] = fitOne(data, exposure, peptide, 'linear', sigVback, exposure).then(function (res) {
                // console.log(cycle, exposure, 'linear', res, res.equation.func([res.passback], res[sigVback].parameters));
                return {
                    R2: res[sigVback].R2,
                    val: res.equation.func([res.passback], res[sigVback].parameters, res.equation.func([res.passback], res[sigVback].parameters))
                };
            });
        } else {
            promises[0] = Promise.resolve({R2: 0, val: 0});
        }

        //check to see if non-linear is worth it
        good = 0;
        forNonLinear = data.get({exposure: exposure, peptide: peptide});
        for (i = 0; i < forNonLinear.length; i += 1) {
            good += forNonLinear[i][sigVback + '_valid'] * 1;
        }
        //Empty, no longer needed
        forNonLinear = [];
        if (good > 5) {
            promises[1] = fitOne(data, exposure, peptide, 'kinetic', sigVback, cycle).then(function (res) {
                // console.log(cycle, exposure, 'kinetic', res, res.equation.func([res.passback], res[sigVback].parameters));
                return {
                    R2: res[sigVback].R2,
                    val: res.equation.func([res.passback], res[sigVback].parameters),
                    passback: res.passback,
                    peptide: peptide
                };
            });
        } else {
            // console.log(forNonLinear, good, exposure);
            promises[1] = Promise.resolve({R2: 0, val: 0, peptide: peptide, cycle: cycle, exposure: exposure});
        }

        return Promise.all(promises).then(function (res) {
            var sol = 0, totalR2 = 0;

            //weighted average
            if (res[0].R2 > 0.8 && !Number.isNaN(res[0].val)) {
                sol += res[0].val * res[0].R2;
                totalR2 += res[0].R2;
            }
            if (res[1].R2 > 0.8 && !Number.isNaN(res[1].val)) {
                sol += res[1].val * res[1].R2;
                totalR2 += res[1].R2;
            }

            //If there was no good data then return NaN
            if (totalR2 > 0) {
                sol = sol / totalR2;
            }
            if (sol && sol < 5500 && sol > 0) {
                return sol;
            }
            return NaN;
        });
    };

    var postFits = function (data) {
        var xP, yP, peptide = data[0], background = data[1], signal = data[2];
        xP = peptide.spot_row - 1;
        yP = peptide.spot_col - 1;
        return {
            x: xP,
            y: yP,
            signal: signal,
            background: background,
            name: peptide.peptide,
            cycle: peptide.cycle,
            exposure: peptide.exposure
        };
    };

    normalize_background = function (worker, counts) {
        return function (data_in) {
            if (!data_in.get || typeof data_in.get !== 'function') {
                throw "Data object does not have get function attached. Use get_kinome.js to add this on.";
            }

            if (data_in.level !== "1.0.1") {
                throw "This is designed only for level 1.0.1 data. You passed in level: " + data_in.level;
            }
            /*
                idea here is to generate two arrays based on, then send them to the worker.
            */

            var peptides, cycle, exposure, after_norm, i, j, k,
                    promises = [], thisProm, img_obj_proms;

            var data = data_in.clone();
            data.level = '1.1.2';
            cycle = data.list('cycles');
            exposure = data.list('exposures');

            after_norm = function (res) {
                var l = 0, one;
                // console.log(res);
                for (l = 0; l < res.backgrounds.length; l += 1) {
                    one = data.get({
                        cycle: res.cycle,
                        exposure: res.exposure,
                        peptide: res.backgrounds[l].peptide
                    })[0];
                    if (one.background_valid) {
                        one.set('background', res.backgrounds[l].background);
                    }
                }
                counts.done += 1;
                counts.done = Math.floor(counts.done);
                return;
            };

            var parse_img = function (res_arr) {
                var img = {
                    background: [],
                    signal: [],
                    name: []
                };
                res_arr.map(function (obj) {
                    img.background[obj.x] = img.background[obj.x] || [];
                    img.signal[obj.x] = img.signal[obj.x] || [];
                    img.name[obj.x] = img.name[obj.x] || [];
                    img.cycle = obj.cycle;
                    img.exposure = obj.exposure;

                    img.background[obj.x][obj.y] = obj.background;
                    img.signal[obj.x][obj.y] = obj.signal;
                    img.name[obj.x][obj.y] = obj.name;
                    // counts.done += 2;
                });
                // console.log(res_arr, img);
                return img;
            };

            var normBackground = function (img) {
                if (img.background.length && img.background[0].length) {
                    // counts.total += 1;
                    // counts.total = Math.floor(counts.total);
                    return worker.submit(img).then(after_norm);
                }
            };

            for (i = 0; i < cycle.length; i += 1) {
                for (j = 0; j < exposure.length; j += 1) {
                    peptides = data.get({cycle: cycle[i], exposure: exposure[j]});
                    img_obj_proms = [];
                    for (k = 0; k < peptides.length; k += 1) {
                        //Build the promise information
                        thisProm = [Promise.resolve(peptides[k])];

                        //If the background is not valid
                        // counts.total += 1;
                        if (!peptides[k].background_valid) {
                            thisProm[1] = getFits(
                                data_in,
                                peptides[k],
                                'background'
                            );
                        } else {
                            thisProm[1] = Promise.resolve(peptides[k].background);
                        }

                        //If the signal is not valid
                        // counts.total += 1;
                        if (!peptides[k].signal_valid) {
                            thisProm[2] = getFits(
                                data_in,
                                peptides[k],
                                'signal'
                            );
                        } else {
                            thisProm[2] = Promise.resolve(peptides[k].signal);
                        }

                        img_obj_proms.push(Promise.all(thisProm).then(postFits));
                    }
                    if (img_obj_proms.length) {
                        counts.total += 1;
                    }
                    promises.push(Promise.all(img_obj_proms).then(parse_img).then(normBackground));
                }
            }
            return Promise.all(promises).then(function () {
                return data;
            });

        };
    };

    shiftToMin = function (data) {
        var i, j, exposures = data.list('exposures'), getMinSignal, getMin, min,
                minCycle, points;
        getMinSignal = function (x) {
            var mini = Infinity;
            if (x.background_valid) {
                mini = Math.min(mini, x.background);
            }
            if (x.signal_valid) {
                mini = Math.min(mini, x.signal);
            }
            return mini;
        };
        getMin = function (a, b) {
            if (typeof a === "number" && typeof b === 'number') {
                return Math.min(a, b);
            }
            if (typeof a === "number") {
                return a;
            }
            if (typeof b === "number") {
                return b;
            }
            return Infinity;
        };

        minCycle = data.list('cycles').reduce(getMin);
        for (i = 0; i < exposures.length; i += 1) {
            points = data.get({
                cycle: minCycle,
                exposure: exposures[i]
            });
            if (points.length > 1) {
                min = points.map(getMinSignal).reduce(getMin);
                // console.log(min, exposures[i]);
                points = data.get({
                    exposure: exposures[i]
                }); //This will get everything except post wash
                for (j = 0; j < points.length; j += 1) {
                    points[j].set('signal', points[j].signal - min);
                    points[j].set('background', points[j].background - min);
                }
            }
        }
        return data;
    };

    main = function (input_params) {
        return new Promise(function (resolve, reject) {
            if (!input_params.data || typeof input_params.data !== 'object') {
                reject("Data object not added in. This will not work without it.");
            }
            if (!input_params.amd_ww || typeof input_params.amd_ww !== 'object') {
                reject("AMD_WW object not added in. This will not work without it.");
            }
            if (!input_params.worker || typeof input_params.worker !== 'string') {
                reject("String for worker url not added in. This will not work without it.");
            }
            if (!Array.isArray(input_params.data)) {
                input_params.data = [input_params.data];
            }

            var backgroundPromise, worker, num_thread, counts = {total: 0, done: 0};

            //start up the workers
            num_thread = input_params.number_threads || undefined;
            worker = input_params.amd_ww.start({
                filename: input_params.worker,
                num_workers: num_thread
            });

            console.log('\nStarting fits for background normalization.\n');

            //now map through the data, each map command returns a new promise
            // if they all work then we will resolve with the solution, or if
            // not then throw the error.
            backgroundPromise = Promise.all(input_params.data.map(normalize_background(
                worker,
                counts
            ))).catch(function (err) {
                reject({message: "Background normalization failed:", error: err});
            });

            // linearPromise.then(function (final_data) {
            backgroundPromise.then(function (final_data) {
                final_data = final_data.map(shiftToMin); //takes it from 1.1.1 to 1.1.2
                resolve(final_data);
            }).catch(function (err) {
                reject(err);
            });

            if (input_params.hasOwnProperty("update") && typeof input_params.update === 'function') {
                input_params.update(counts);
            }
        });
    };

    exports.normalize_background = main;

    return exports;

}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
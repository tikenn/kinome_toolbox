/*global KINOME*/

(function (exports) {
    "use strict";

    /*

    So this is going to fit all the data both linear and non linear, then detect
    outlier automatically. Starts with the linear since that will ease the
    problems for the non linear.

    */

    var main, find_outliers_linear, linear_cutoff, kinetic_cutoff, get_models,
            lin_r2_cut, find_outliers_kinetic, shiftToMin;//, blank;

    //These are constants determined by testing.
    linear_cutoff = 56.9441;
    lin_r2_cut = 0.8;
    kinetic_cutoff = 163.4145573051634;

    get_models = function (array, y_str, eq_string) {
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
            signal.x.push(array[i][y_str]);
            signal.y.push(array[i].signal);
            signal.valid.push(array[i].signal_valid);
            //background
            background.x.push(array[i][y_str]);
            background.y.push(array[i].background);
            background.valid.push(array[i].background_valid);
        }
        return {
            signal: signal,
            background: background
        };
    };

    find_outliers_linear = function (worker, counts1) {
        return function (data) {
            //check for get function
            if (!data.get || typeof data.get !== 'function') {
                throw "Data object does not have get function attached. Use get_kinome.js to add this on.";
            }

            //variable declaration
            var cycles, peptides, points, models,
                    promises = [], post_linear;//, list = [];

            //clone the data object so we can make changes to it.
            data = data.clone();
            data.level = "1.0.1";

            //define the callbacks for individual fits
            post_linear = function (x) {
                var i, error = false, get_res, mod;
                /*
                    Comes back as [origin, result]
                    orgin: {
                        peptide:
                        cycle:
                        type:
                    }
                    result: {
                        parameters: [m, b]
                        R2:
                        errors: [{error: y:[]}, ", ", ", "]
                        robust: [T/F depending on if robust was performed]
                        remove: null if none, index if there is one
                    }

                    If any of the errors are greater than the cutoff then
                    set the valid to 0.
                    Then append the data for the slope if it is all good. If
                    not then refit the data.
                */

                // if (!x[1].robust) {
                //     var MAD, MADa, dd, med1;
                //     dd = x[1].errors.map(function (zz) {
                //         return zz.error;
                //     });
                //     dd = dd.sort(function (a, b) {
                //         return a - b;
                //     });
                //     med1 = (dd[Math.floor(dd.length / 2)] + dd[Math.floor((dd.length - 1) / 2)]) / 2;

                //     MADa = dd.map(function (zz) {
                //         return Math.abs(zz - med1);
                //     });

                //     MADa = MADa.sort(function (a, b) {
                //         return a - b;
                //     });
                //     MAD = (MADa[Math.floor(MADa.length / 2)] + MADa[Math.floor((MADa.length - 1) / 2)]) / 2 * 1.4826;
                //     MAD = Math.max(MAD, 1);
                //     for (i = 0; i < dd.length; i += 1) {
                //         list.push((Math.abs(dd[i] - med1) / MAD) + "\t" + x[1].errors[i].y + "\t" + x[1].errors[i].error);
                //     }
                // }

                //If this is a robust fit, then remove the corresponding point.
                if (x[1].robust && x[1].remove >= 0) {
                    //remove that point!
                    data.get(x[0])[x[1].remove].set(x[0].type + '_valid', 0);
                }

                if (!x[1].robust || x[1].remove >= 0) {
                    //Since errors should not happen often first check stuff out
                    for (i = 0; !error && i < x[1].errors.length; i += 1) {
                        if (Math.pow(x[1].errors[i].error, 2) > linear_cutoff) {
                            error = true;
                        }
                    }

                    //if any outliers did occur then refit with robust fitting
                        // Also do not allow this to remove another point if
                        // there is only 3 left. A 2 point line is worse than a
                        // poorly fit 3 point line.
                    if (error && x[1].errors.length > 3) {
                        //do some robust fitting
                        get_res = data.get(x[0]);
                        mod = get_models(get_res, 'exposure', 'linear');
                        mod[x[0].type].equation.robust = true;
                        return worker.submit({
                            model: mod[x[0].type],
                            origin: x[0]
                        }).then(post_linear);
                    }
                }

                //good fit, add in the new data point
                counts1.done += 1;
                x[0].exposure = null;
                x[0].value = x[1].parameters[0];
                x[0].valid = x[1].R2 > lin_r2_cut
                    ? 1
                    : 0;

                //Do not append for post wash
                if (Number.isFinite(x[0].cycle)) {
                    data.put(x[0]);
                }

                return true; //clears extra stuff from promise memory
            };

            //Start the linear fits
            cycles = data.list('cycle');
            peptides = data.list('peptides');

            var i, j;
            for (i = 0; i < peptides.length; i += 1) {
                for (j = 0; j < cycles.length; j += 1) {
                    points = data.get({peptide: peptides[i], cycle: cycles[j]});
                    if (points.length > 1) {
                        //This means we can fit a line
                        models = get_models(points, 'exposure', 'linear');
                        counts1.total += 2;
                        promises.push(worker.submit({
                            model: models.signal,
                            origin: {peptide: peptides[i], cycle: cycles[j], type: 'signal'}
                        }).then(post_linear));
                        promises.push(worker.submit({
                            model: models.background,
                            origin: {peptide: peptides[i], cycle: cycles[j], type: 'background'}
                        }).then(post_linear));
                    }
                }
            }

            return Promise.all(promises).then(function () {
                // var fs = require('fs');
                // fs.writeFile('mad_errors' + data.name, list.join('\n'), blank);
                return data;
            }).catch(function (err) {
                console.log('something failed...', err);
            });

                // return [exposures, linear_cutoff, kinetic_cutoff, data, worker, equation, worker_url, resolve];
        };
    };

    find_outliers_kinetic = function (worker, equation, counts2) {
        return function (data) {
            //check for get function
            if (!data.get || typeof data.get !== 'function') {
                throw "Data object does not have get function attached. Use get_kinome.js to add this on.";
            }

            //variable declaration
            var exposure, peptides, points, models, list = [],
                    promises = [], post_fit, errorc = 0, shiftTo0;

            //clone the data object so we can make changes to it.
            data = data.clone();

            shiftTo0 = function (mod_obj) {
                var i, min;
                for (i = 0; min === undefined && i < mod_obj.y.length; i += 1) {
                    if (mod_obj.valid[i]) {
                        min = mod_obj.y[i];
                    }
                }
                min -= 5;
                for (i = 0; i < mod_obj.y.length; i += 1) {
                    mod_obj.y[i] -= min;
                }
                return mod_obj;
            };

            //define the callbacks for individual fits
            post_fit = function (x) {
                var i, error = false, get_res, mod;
                /*
                    Comes back as [origin, result]
                    orgin: {
                        peptide:
                        exposure:
                        type:
                    }
                    result: {
                        parameters: [m, b]
                        R2:
                        errors: [{error: y:[]}, ", ", ", "]
                        robust: [T/F depending on if robust was performed]
                        remove: null if none, index if there is one
                    }

                    If any of the errors are greater than the cutoff then
                    set the valid to 0.
                    Then append the data for the slope if it is all good. If
                    not then refit the data.
                */

                //If this is a robust fit, then remove the corresponding point.
                if (!x[1].robust) {
                    x[1].errors.map(function (zz) {
                        list.push(zz.error + '\t' + zz.y);
                    });
                }

                if (x[1].robust && x[1].remove >= 0) {
                    //remove that point!
                    data.get(x[0])[x[1].remove].set(x[0].type + '_valid', 0);
                }

                //Do not do a robust fit more than 3 times...
                if (!x[1].robust || (x[1].remove >= 0 && x[1].robust < 4)) {
                    //Since errors should not happen often first check stuff out
                    for (i = 0; !error && i < x[1].errors.length; i += 1) {
                        if (Math.pow(x[1].errors[i].error, 2) > kinetic_cutoff) {
                            error = true;
                        }
                    }

                    //if any outliers did occur then refit with robust fitting
                        // also, keep total points above 8.
                    if (error && x[1].errors.length > 8) {
                        //do some robust fitting
                        if (!x[1].robust) {
                            errorc += 1;
                        }
                        get_res = data.get(x[0]);
                        mod = get_models(get_res, 'cycle', equation);
                        mod[x[0].type].equation.robust = x[1].robust || 0;
                        mod[x[0].type].equation.robust += 1;
                        return worker.submit({
                            model: shiftTo0(mod[x[0].type]),
                            origin: x[0]
                        }).then(post_fit);
                    }
                }

                //good fit, add in the new data point
                counts2.done += 1;
                return true; //clears extra stuff from promise memory
            };

            //Start the linear fits
            exposure = data.list('exposure');
            peptides = data.list('peptides');

            var i, j;
            for (i = 0; i < peptides.length; i += 1) {
                for (j = 0; j < exposure.length; j += 1) {
                    points = data.get({peptide: peptides[i], exposure: exposure[j]});
                    if (points.length > 1) {
                        //This means we can fit a line
                        models = get_models(points, 'cycle', equation);
                        counts2.total += 2;
                        promises.push(worker.submit({
                            model: shiftTo0(models.signal),
                            origin: {peptide: peptides[i], exposure: exposure[j], type: 'signal'}
                        }).then(post_fit));
                        promises.push(worker.submit({
                            model: shiftTo0(models.background),
                            origin: {peptide: peptides[i], exposure: exposure[j], type: 'background'}
                        }).then(post_fit));
                    }
                }
            }

            return Promise.all(promises).then(function () {
                return data;
            }).catch(function (err) {
                console.error('kinetic something failed...', JSON.stringify(err));
            });

                // return [exposures, linear_cutoff, kinetic_cutoff, data, worker, equation, worker_url, resolve];
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
                Math.min(mini, x.signal);
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

    // blank = function () {
    //     //do nothing
    //     return;
    // };

    main = function (filter_object) {
        /*
        filter object is at the heart of this. It expects to have the following
        things added on:
            data: the data with a get function,
            amd_ww: my package for managing web workers,
            equation: equation to be used for error generation,
            worker: url for the worker to start up

        This will return a promise!
        */
        return new Promise(function (resolve, reject) {
            if (!filter_object.data || typeof filter_object.data !== 'object') {
                reject("Data object not added in. This will not work without it.");
            }
            if (!filter_object.amd_ww || typeof filter_object.amd_ww !== 'object') {
                reject("AMD_WW object not added in. This will not work without it.");
            }
            if (!filter_object.equation || typeof filter_object.equation !== 'string') {
                reject("Equation string not added in. This will not work without it.");
            }
            if (!filter_object.worker || typeof filter_object.worker !== 'string') {
                reject("String for worker url not added in. This will not work without it.");
            }
            if (!Array.isArray(filter_object.data)) {
                filter_object.data = [filter_object.data];
            }

            //now map through the data, each map command returns a new promise
            // if they all work then we will resolve with the solution, or if
            // not then throw the error.

            //start up the workers
            var linearPromise, kineticPromise, worker, num_thread,
                    counts1 = {done: 0, total: 0},
                    counts2 = {done: 0, total: 0};

            num_thread = filter_object.number_threads || undefined;
            worker = filter_object.amd_ww.start({
                filename: filter_object.worker,
                num_workers: num_thread
            });

            console.log('\nStarting fits for outlier detection.\n');


            linearPromise = Promise.all(filter_object.data.map(find_outliers_linear(
                worker,
                counts1
            ))).catch(function (err) {
                reject("Linear fit failed" + err);
            });

            if (filter_object.hasOwnProperty("linearUpdate") && typeof filter_object.linearUpdate === 'function') {
                filter_object.linearUpdate(counts1);
            }

            // Once the linear are done, start the kinetic
            kineticPromise = linearPromise.then(function (d1) {
                var p2 = Promise.all(d1.map(find_outliers_kinetic(
                    worker,
                    filter_object.equation,
                    counts2
                )));
                if (filter_object.hasOwnProperty("kineticUpdate") && typeof filter_object.kineticUpdate === 'function') {
                    filter_object.kineticUpdate(counts2);
                }

                return p2;
            });

            // linearPromise.then(function (final_data) {
            kineticPromise.then(function (final_data) {
                final_data = final_data.map(shiftToMin);
                resolve(final_data);
            }).catch(function (err) {
                reject(err);
            });

        });
    };

    exports.filter = main;

    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
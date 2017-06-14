/*global KINOME*/

(function (exports) {
    "use strict";

    /*

    So this is going to fit all the data both linear and non linear, then detect
    outlier automatically. Starts with the linear since that will ease the
    problems for the non linear.

    */

    var main, fit_curves, get_models;

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

    fit_curves = function (worker, equation, counts) {
        return function (data) {
            //check for get function
            if (!data.get || typeof data.get !== 'function') {
                throw "Data object does not have get function attached. Use get_kinome.js to add this on.";
            }

            //variable declaration
            var cycles, peptides, points, models, out, exposure, post_kinetic,
                    promises = [], post_linear, i, j;//, list = [];

            //clone the data object so we can make changes to it.
            out = data.level_up(equation);

            //define the callbacks for individual fits
            post_linear = function (x) {
                var putObj;
                /*
                    Comes back as [origin, result]
                    origin: {
                        peptide:
                        cycle:
                        type: [signal | background]
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

                counts.done += 1;
                // console.log('linear', x);

                //append the data to the out
                putObj = {
                    peptide: x[0].peptide,
                    cycle: x[0].cycle,
                    type: 'linear'
                };
                putObj[x[0].type] = {
                    R2: x[1].R2,
                    parameters: x[1].parameters
                };

                out.put(putObj);

                return true; //clears extra stuff from promise memory
            };

            post_kinetic = function (x) {
                var putObj;
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

                counts.done += 1;
                // console.log('kinetic', x);

                //append the data to the out
                putObj = {
                    peptide: x[0].peptide,
                    exposure: x[0].exposure,
                    type: 'kinetic'
                };
                putObj[x[0].type] = {
                    R2: x[1].R2,
                    parameters: x[1].parameters,
                    WW: x[1].WWtest[0]
                };

                out.put(putObj);

                return true; //clears extra stuff from promise memory
            };

            //Start the linear fits
            cycles = data.list('cycle');
            exposure = data.list('exposure');
            peptides = data.list('peptides');

            for (i = 0; i < peptides.length; i += 1) {
                // for each linear model
                for (j = 0; j < cycles.length; j += 1) {
                    points = data.get({peptide: peptides[i], cycle: cycles[j]});
                    if (points.length > 1) {
                        //This means we can fit a line
                        models = get_models(points, 'exposure', 'linear');
                        counts.total += 2;
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

                //for each kinetic model
                for (j = 0; j < exposure.length; j += 1) {
                    points = data.get({peptide: peptides[i], exposure: exposure[j]});
                    if (points.length > 1) {
                        //This means we can fit a line
                        models = get_models(points, 'cycle', equation);
                        counts.total += 2;
                        promises.push(worker.submit({
                            model: models.signal,
                            origin: {peptide: peptides[i], exposure: exposure[j], type: 'signal'}
                        }).then(post_kinetic));
                        promises.push(worker.submit({
                            model: models.background,
                            origin: {peptide: peptides[i], exposure: exposure[j], type: 'background'}
                        }).then(post_kinetic));
                    }
                }
            }

            return Promise.all(promises).then(function () {
                // var fs = require('fs');
                // fs.writeFile('mad_errors' + data.name, list.join('\n'), blank);
                return out;
            }).catch(function (err) {
                console.log('something failed...', err);
            });

                // return [exposures, linear_cutoff, kinetic_cutoff, data, worker, equation, worker_url, resolve];
        };
    };

    main = function (fit_object) {
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
            if (!fit_object.data || typeof fit_object.data !== 'object') {
                reject("Data object not added in. This will not work without it.");
            }
            if (!fit_object.amd_ww || typeof fit_object.amd_ww !== 'object') {
                reject("AMD_WW object not added in. This will not work without it.");
            }
            if (!fit_object.equation || typeof fit_object.equation !== 'string') {
                reject("Equation string not added in. This will not work without it.");
            }
            if (!fit_object.worker || typeof fit_object.worker !== 'string') {
                reject("String for worker url not added in. This will not work without it.");
            }
            if (!Array.isArray(fit_object.data)) {
                fit_object.data = [fit_object.data];
            }

            //now map through the data, each map command returns a new promise
            // if they all work then we will resolve with the solution, or if
            // not then throw the error.

            //start up the workers
            var worker, num_thread, counts = {done: 0, total: 0};

            num_thread = fit_object.number_threads || undefined;
            worker = fit_object.amd_ww.start({
                filename: fit_object.worker,
                num_workers: num_thread
            });

            console.log('\nStarting fits for level 2 data.\n');


            Promise.all(fit_object.data.map(fit_curves(
                worker,
                fit_object.equation,
                counts
            ))).catch(function (err) {
                reject("Fitting failed" + err);
            }).then(function (fits) {
                //Just to be sure this updates correctly.
                counts.done = counts.total;
                resolve(fits);
            });

            if (fit_object.hasOwnProperty("update") && typeof fit_object.update === 'function') {
                fit_object.update(counts);
            }

        });
    };

    exports.parameterize = main;

    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
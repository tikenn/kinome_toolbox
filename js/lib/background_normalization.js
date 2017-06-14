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

    normalize_background = function (worker, counts) {
        return function (data) {
            if (!data.get || typeof data.get !== 'function') {
                throw "Data object does not have get function attached. Use get_kinome.js to add this on.";
            }

            if (data.level !== "1.0.1") {
                throw "This is designed only for level 1.0.1 data. You passed in level: " + data.level;
            }
            /*
                idea here is to generate two arrays based on, then send them to the worker.
            */

            var peptides, cycle, exposure, after_norm, i, j, k, img, x, y,
                    promises = [];

            data = data.clone();
            data.level = '1.1.2';
            cycle = data.list('cycles');
            exposure = data.list('exposures');

            after_norm = function (res) {
                var l = 0, one;
                for (l = 0; l < res.backgrounds.length; l += 1) {
                    one = data.get({
                        cycle: res.cycle,
                        exposure: res.exposure,
                        peptide: res.backgrounds[l].peptide
                    })[0];
                    one.set('background', res.backgrounds[l].background);
                }
                counts.done += 1;
                return;
            };

            for (i = 0; i < cycle.length; i += 1) {
                for (j = 0; j < exposure.length; j += 1) {
                    peptides = data.get({cycle: cycle[i], exposure: exposure[j]});
                    img = {
                        background: [],
                        signal: [],
                        name: [],
                        cycle: cycle[i],
                        exposure: exposure[j]
                    };
                    for (k = 0; k < peptides.length; k += 1) {
                        x = peptides[k].spot_row - 1;
                        y = peptides[k].spot_col - 1;
                        img.background[x] = img.background[x] || [];
                        img.signal[x] = img.signal[x] || [];
                        img.name[x] = img.name[x] || [];
                        img.name[x][y] = peptides[k].peptide;
                        if (peptides[k].background_valid) {
                            //if background is valid, keep going
                            img.background[x][y] = peptides[k].background;
                            if (peptides[k].signal_valid) {
                                img.signal[x][y] = peptides[k].signal;
                            } else {
                                img.signal[x][y] = NaN;
                                //Other option is to set this to 10x background. Works well for high signal spots... Not so well for lower signal. Although this is already shifted, which may help.
                            }
                        } else {
                            img.background[x][y] = NaN;
                            img.signal[x][y] = NaN;
                        }
                    }
                    //Now that I have set this up, send it to the worker
                    counts.total += 1;
                    promises.push(worker.submit(img).then(after_norm));
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
            min = points.map(getMinSignal).reduce(getMin);
            points = data.get({
                exposure: exposures[i]
            }); //This will get everything except post wash
            for (j = 0; j < points.length; j += 1) {
                points[j].set('signal', points[j].signal - min);
                points[j].set('background', points[j].background - min);
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

            if (input_params.hasOwnProperty("update") && typeof input_params.update === 'function') {
                input_params.update(counts);
            }


            // linearPromise.then(function (final_data) {
            backgroundPromise.then(function (final_data) {
                final_data = final_data.map(shiftToMin); //takes it from 1.1.1 to 1.1.2
                resolve(final_data);
            }).catch(function (err) {
                reject(err);
            });

        });
    };

    exports.normalize_background = main;

    return exports;

}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
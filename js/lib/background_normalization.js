/*global KINOME*/

(function (exports) {
    "use strict";
    /*

        The purpose of this function is to take in a number of data objects and
        apply the transformation to the background. This is done on an image by
        image basis.

    */
    // variable declarations
    var main, shiftToMin, counts = {total: 0, done: 0}, normalize_background;

    normalize_background = function (worker) {
        return function (data) {
            return [data, worker];
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

            var backgroundPromise, worker, num_thread;

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
                worker
            ))).catch(function (err) {
                reject({message: "Background normalization failed:", error: err});
            });

            if (input_params.hasOwnProperty("update") && typeof input_params.update === 'function') {
                input_params.update(counts);
            }


            // linearPromise.then(function (final_data) {
            backgroundPromise.then(function (final_data) {
                final_data = final_data.map(shiftToMin);
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
/*global KINOME module google Blob jQuery save ID $ window*/

(function (exports) {
    "use strict";

    var getParameter, data, code, strPromise, dataPromiseArray, requires, styles,
            getDATA, getDataParameters, strings, getScript, getSTYLES;

    requires = [require('enrich_kinome')];

    getParameter = function (name) {
        var url = decodeURIComponent(location.href), regex, match, matches = [];

        //Deal with open close brackets in name
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");

        //Find the part of interest
        regex = new RegExp("(?:[\\?&]" + name + "=\")([^\"]*)\"", 'g');

        //actually find the regex stuff
        match = regex.exec(url);
        while (match) {
            matches.push(match[1]);
            match = regex.exec(url);
        }

        // console.log(name, matches, url);

        return matches;
    };

    getDataParameters = function (url) {
        var i, regex, match, matches = [];
        regex = new RegExp('data=\\*\\[([\\s\\S]+?)\\]\\*', 'g');
        match = regex.exec(url);
        while (match) {
            matches.push(match[1]);
            match = regex.exec(url);
        }
        for (i = 0; i < matches.length; i += 1) {
            matches[i] = matches[i].split(';');
        }
        return matches;
    };

    getSTYLES = function (dataURL) {
        return require(dataURL, 'style').catch(function (err) {
            KINOME.error(err, "Failed to load style: " + dataURL + '.');
        });
    };

    getDATA = function (dataURLArr) {
        return require(dataURLArr, 'json').then(function (results) {
            var j, k, result, solution = [];
            for (j = 0; j < results.length; j += 1) {
                result = results[j];
                if (!Array.isArray(result)) {
                    result = [result];
                }
                for (k = 0; k < result.length; k += 1) {
                    Object.defineProperty(result[k], 'data_origin_url', {
                        enumerable: false,
                        configurable: false,
                        writable: false,
                        value: dataURLArr[j]
                    });
                }
                result = KINOME.enrich(result);
                solution = solution.concat(result);
            }
            return solution;
        });
    };

    getScript = function (codeURL) {
        return function () {
            return require(codeURL).catch(function (err) {
                KINOME.error(err, "Failed to load script: " + codeURL + '.');
            });
        };
    };

    //get the parameters
    strings = getParameter('text');
    styles = getParameter('style');
    data = getDataParameters(decodeURIComponent(location.href));
    code = getParameter('code');

    // console.log(strings, data, code);

    //set up parts of the DATA object
    exports.params = {};
    exports.params.strings = [];
    exports.params.data = [];
    exports.params.script_urls = code;

    //This does not depend on anything...
    if (strings.length) {
        strPromise = require(strings, 'text').then(function (strs) {
            var i = 0;
            for (i = 0; i < strs.length; i += 1) {
                exports.params.strings[i] = {
                    value: strs[i],
                    url: strings[i]
                };
            }
        });
    } else {
        //it just works then.
        strPromise = Promise.resolve();
    }

    if (styles.length) {
        //this can be done at any point.
        require(styles, 'style');
    }

    //make sure requires are met for getting data and then code.
    Promise.all(requires).then(function () {
        //Now asyncronously grab all the data and strings
        dataPromiseArray = data.map(getDATA).map(function (promise, ind) {
            return promise.then(function (resolvedData) {
                exports.params.data[ind] = {
                    value: resolvedData,
                    url: data[ind]
                };
            }).catch(function (err) {
                KINOME.error(err, 'Failed to load one of the following data sets: ' + data[ind].join('<br />'));
            });
        });
        dataPromiseArray.push(strPromise);

        //Once data has loaded, load the scripts
        Promise.all(dataPromiseArray).then(function () {
            // Now that all data and text has loaded
            // make sure google charts has loaded
            // load the scripts in the order listed.
            //Once google chart tools has loaded, load the other scripts
            google.charts.setOnLoadCallback(function () {
                var i, promise_chain = Promise.resolve();
                //Daisy chain promises together
                for (i = 0; i < code.length; i += 1) {
                    promise_chain = promise_chain.then(getScript(code[i]));
                }
                promise_chain.then(getScript('webpage'));
            });
        });
    });

    //set up standard functions
    exports.loadStyle = getSTYLES;

    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
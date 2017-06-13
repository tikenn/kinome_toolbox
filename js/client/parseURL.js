/*global KINOME module google Blob jQuery save ID $ window*/

(function (exports) {
    "use strict";

    var getParameter, data, code, getSTRINGS, dataPromiseArray, requires, styles,
            getDATA, getDataParameters, strings, getScript, writeError, getSTYLES;

    requires = [require('enrich_kinome')];

    getParameter = function (name) {
        var url = location.href, regex, match, matches = [];

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

        return matches;
    };

    writeError = function (url) {
        return function (err) {
            console.error('failed to get script: ' + url, err);
            $('#status').append(
                '<div class="alert alert-danger alert-dismissable fade in"><strong><a href='
                + url + '>' + url + '</a></strong> failed to load. Make sure the URL you provided'
                + ' is correct. It it is, please try refreshing the page.<a href="#" class="close" data-dismiss="alert"'
                + ' aria-label="close">&times;</a></div>'
            );
            return err;
        };
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

    getSTRINGS = function (dataURL) {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: dataURL,
                dataType: "text",
                success: resolve,
                error: reject
            });
        }).catch(writeError(dataURL));
    };

    getSTYLES = function (dataURL) {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: dataURL,
                dataType: "text",
                success: function (css) {
                    $('<style type="text/css"></style>').html(css).appendTo('head');
                    resolve();
                },
                error: reject
            });
        }).catch(writeError(dataURL));
    };

    getDATA = function (dataURLArr) {
        var i, promises = [], ajaxPromise;

        ajaxPromise = function (dataURL) {
            return new Promise(function (resolve, reject) {
                $.ajax({
                    url: dataURL,
                    dataType: "text",
                    success: resolve,
                    error: reject
                });
            });
        };

        for (i = 0; i < dataURLArr.length; i += 1) {
            promises.push(ajaxPromise(dataURLArr[i]).catch(writeError(dataURLArr[i])));
        }
        return Promise.all(promises).then(function (results) {
            var j, k, result, solution = [];
            for (j = 0; j < results.length; j += 1) {
                result = JSON.parse(results[j]);
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
            return require(codeURL).catch(writeError(codeURL));
        };
    };

    //get the parameters
    strings = getParameter('text');
    styles = getParameter('style');
    data = getDataParameters(decodeURIComponent(location.href));
    code = getParameter('code');

    console.log(strings, data, code);

    //set up parts of the DATA object
    exports.params = {};
    exports.params.strings = [];
    exports.params.data = [];
    exports.params.script_urls = code;

    //This does not depend on anything...
    dataPromiseArray = strings.map(getSTRINGS).map(function (promise, ind) {
        return promise.then(function (resolvedData) {
            exports.params.strings[ind] = {
                value: resolvedData,
                url: strings[ind]
            };
        });
    }).concat(styles.map(getSTYLES));

    //make sure requires are met for getting data and then code.
    Promise.all(requires).then(function () {
        //Now asyncronously grab all the data and strings

        dataPromiseArray = dataPromiseArray.concat(data.map(getDATA).map(function (promise, ind) {
            return promise.then(function (resolvedData) {
                exports.params.data[ind] = {
                    value: resolvedData,
                    url: data[ind]
                };
            });
        }));

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

        //set up standard functions
        exports.loadData = function (urls) {
            if (!Array.isArray(urls)) {
                urls = [urls];
            }
            return getDATA(urls).then(function (data) {
                data = data.map(function (x) {
                    return KINOME.enrich(x);
                });
                exports.params.data.push({value: data, url: urls});
                return data;
            });
        };
    });

    exports.loadStrings = function (urls) {
        if (!Array.isArray(urls)) {
            urls = [urls];
        }
        return getSTRINGS(urls).then(function (strings) {
            exports.params.strings.push({value: strings, url: urls});
            return strings;
        });
    };

    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
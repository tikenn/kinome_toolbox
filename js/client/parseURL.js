/*global KINOME module google Blob jQuery save ID $ window*/

(function (exports) {
    "use strict";

    var getParameter, data, code, getSTRINGS, dataPromiseArray, requires, styles,
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

    getSTRINGS = function (dataURL) {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: dataURL,
                dataType: "text",
                success: resolve,
                error: reject
            });
        }).catch(function (err) {
            KINOME.error(err, "Failed to load string: " + dataURL + '.');
        });
    };

    getSTYLES = function (dataURL) {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: dataURL,
                dataType: "text",
                success: function (css) {
                    $('<style type="text/css"></style>').html(css).appendTo('head');
                    resolve(true);
                },
                error: reject
            });
        }).catch(function (err) {
            KINOME.error(err, "Failed to load style: " + dataURL + '.');
        });
    };

    getDATA = function (dataURLArr) {
        var i, promises = [], ajaxPromise, databaseRegex, uuidRegex, nameRegex, timeLimits;

        uuidRegex = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
        databaseRegex = '\\?find=\\{"name_id":(\\{"\\$in":\\[("' + uuidRegex + '",*)+\\]\\}|' +
                '"' + uuidRegex + '")\\}';
        databaseRegex = new RegExp(databaseRegex, 'i');
        nameRegex = new RegExp(/[\s\S]+name\/*$/i);

        timeLimits = {
            name: 24 * 60 * 60 * 1000, //24 hours
            data: 90 * 24 * 60 * 60 * 1000, // 90 days
            other: 0.5 * 60 * 60 * 1000 // 1/2 hour
            // other: 1 * 60 * 1000, // 1 minute, testing
            // name: 1 * 60 * 1000 //1 minute, testing
        };

        ajaxPromise = function (dataURL) {
            return new Promise(function (resolve, reject) {
                //Only load from memory if the url is only grabbing specific samples.
                var dataURL_decode = decodeURIComponent(dataURL).replace(/\s/, '');

                //If this is grabbing specific documents then cache it.
                KINOME.db.open.then(function () {
                    var collection = KINOME.db.db.where('url').equals(dataURL);
                    collection.toArray().then(function (x) {
                        var indexdb_entry, useCache = false, now = new Date();

                        //essential goal here is to grab any object that may
                            // already be stored, check if it has expired,
                            // delete it if it has expired, then cache the new
                            // version.
                        if (x.length === 1 && x[0].time) {
                            indexdb_entry = x[0];
                            // console.log(now - new Date(indexdb_entry.time));
                            if (dataURL_decode.match(databaseRegex)) {
                                if (now - new Date(indexdb_entry.time) < timeLimits.data) {
                                    useCache = true;
                                }
                            } else if (dataURL_decode.match(nameRegex)) {
                                if (now - new Date(indexdb_entry.time) < timeLimits.name) {
                                    useCache = true;
                                }
                            } else if (now - new Date(indexdb_entry.time) < timeLimits.other) {
                                useCache = true;
                            }
                            if (!useCache) {
                                //time limit has expired delete this entry
                                collection.delete();
                                // console.log('deleting', indexdb_entry);
                            }
                        }
                        if (useCache) {
                            resolve(x[0].text);
                        } else {
                            $.ajax({
                                url: dataURL,
                                dataType: "text",
                                success: function (res) {
                                    KINOME.db.db.put({
                                        text: res,
                                        url: dataURL,
                                        time: String(new Date())
                                    }).then(function () {
                                        resolve(res);
                                    });
                                },
                                error: reject
                            });
                        }
                    });
                });
            });
        };

        for (i = 0; i < dataURLArr.length; i += 1) {
            promises.push(ajaxPromise(dataURLArr[i]));
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
            }).catch(function (err) {
                KINOME.error(err, 'Failed to load data: ' + data[ind]);
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

    exports.loadStyle = getSTYLES;

    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
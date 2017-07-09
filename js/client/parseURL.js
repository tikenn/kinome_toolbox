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
        var regex, match, matches = [];
        regex = new RegExp('data=\\*\\[([\\s\\S]+?)\\]\\*', 'g');
        match = regex.exec(url);
        while (match) {
            matches.push(match[1]);
            match = regex.exec(url);
        }
        return matches.map(function (mat) {
            return mat.split(';').map(function (mat2) {
                var i, split, base, thisBase, temp_matches, prot;
                temp_matches = mat2.split('|');
                base = temp_matches[0];
                base = base.replace(/\/*\?[\s\S]+$/, '');
                base = base.split(/:\/\//);
                prot = base[0] + '://';
                base = base[1];
                for (i = 1; i < temp_matches.length; i += 1) {
                    split = temp_matches[i].replace(/\/*\?[\s\S]+$/, '').split('/');
                    //empty the blanks
                    while (!split[0] && split.length) {
                        split.shift();
                    }
                    while (!split[split.length - 1] && split.length) {
                        split.pop();
                    }

                    //This will be based on the length of the split arr
                    thisBase = base.replace(new RegExp('(\/[^\/]+){' + split.length + '}$'), '');
                    temp_matches[i] = thisBase + '/' + temp_matches[i];
                    temp_matches[i] = prot + temp_matches[i].replace(/\/+/g, '/');
                }
                return temp_matches;

            }).reduce(function (a, b) {
                return a.concat(b);
            });
        });
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
        }).catch(function (err) {
            KINOME.error(err, 'Failed to load at least one of the requested data sets.');
        });
    };

    getScript = function (codeURL) {
        return function () {
            var alertYes, alertNo, alertTab, promise, mainDiv, ctime,
                    previously_loaded, load_save;

            //set stuff up for previously loaded scripts
            ctime = new Date() - 0;

            load_save = function () {
                previously_loaded.last = ctime;
                previously_loaded.count += 1;

                window.localStorage[codeURL] = JSON.stringify(previously_loaded);

                return true;
            };

            if (window.Storage && window.localStorage[codeURL]) {
                previously_loaded = JSON.parse(window.localStorage[codeURL]);
                if (
                    ctime - previously_loaded.last > 1000 * 60 * 60 //1 hr
                    ||
                    ctime - previously_loaded.first > 1000 * 60 * 60 * 24 // 1 day
                ) {
                    //reset it
                    previously_loaded = {
                        first: ctime,
                        last: ctime,
                        count: 0
                    };
                }
            } else {
                previously_loaded = {
                    first: ctime,
                    last: ctime,
                    count: 0
                };
            }

            //just return early if this is on the whitelist
            if (previously_loaded.count > 2) {
                return require(codeURL).then(load_save).catch(function (err) {
                    KINOME.error(err, "Failed to load script: " + codeURL + '.');
                });
            }

            promise = new Promise(function (resolve, reject) {
                alertYes = $('<div>', {
                    class: 'col col-md-6',
                    style: 'margin-left:auto; margin-right:auto;'
                }).append($('<button>', {
                    class: 'btn btn-info',
                    html: '<span>Trust</span>'
                }).click(function (evt) {
                    evt.preventDefault();
                    mainDiv.alert('close');
                    resolve(true);
                }));

                alertNo = $('<div>', {
                    class: 'col col-md-6',
                    style: 'margin-left:auto; margin-right:auto;'
                }).append($('<button>', {
                    class: 'btn btn-danger',
                    html: '<span>Reject</span>'
                }).click(function (evt) {
                    evt.preventDefault();
                    mainDiv.alert('close');
                    reject('Script rejected by user.');
                }));
            });

            alertTab = $('<div>', {
                class: 'row',
                html: '<div style="padding-top:1%; padding-bottom:1%" class="col col-xs-8 col-sm-10">Script tag loading is being used, for: "<a href="' + codeURL + '">' + codeURL + '</a>". This has loaded ' + previously_loaded.count + ' times previously. Please ensure this is from a trusted source.'
            }).append($('<div>', {
                class: 'col-xs-4 col-sm-2'
            }).append($('<div>', {
                class: 'row text-center'
            }).append(alertYes)
                .append(alertNo)));

            mainDiv = KINOME.warn(alertTab);
            return promise.then(function () {
                return require(codeURL).then(load_save).catch(function (err) {
                    KINOME.error(err, "Failed to load script: " + codeURL + '.');
                });
            }, function (err) {
                console.error('Scirpt rejected by user', err);
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
                promise_chain.then(require('webpage'));
            });
        }).catch(function (err) {
            KINOME.error(err, 'Failed to load at least one of the requested data sets.');
        });
    });

    //set up standard functions
    exports.loadData = function (urls) {
        //this is needed to get the enrich called and the data put in the
            //correct place.
        if (!Array.isArray(urls)) {
            urls = [urls];
        }
        return getDATA(urls).then(function (data) {
            data = data.map(function (x) {
                return KINOME.enrich(x);
            });
            exports.params.data.push({value: data, url: urls});
            return KINOME.enrich(data.map(function (x) {
                return x;
            }));
        });
    };
    exports.loadStyle = getSTYLES;

    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
/*global Dexie KINOME module google Blob jQuery save ID $ window*/
/*

This creates the require function for the browser. Essentially this will only
be loaded if you are in the browser enviornment, it is meant to allow code to
be written for both enviornments. You will have to add things to the defaults
list though in order for it to work properly. If you are just loading things in
as urls this works by assuming jQuery is present and that Promises exist

*/

(function (exports) {
    'use strict';

    var get_function_type, get_data_promise, get_style_promise, reqDone, use_cache,
            get_text_promise, require, defaults, get_script_promise, pages, add_to_db,
            KINOME = {}, pendingRequires = {}, database, cache_db, get_from_db,
            db_open, VERBOSE_REQ;

    defaults = {
        name: ['set_up_table'],
        '1.0.0': ['set_up_table', 'outlier_tab', 'pparameter_display'],
        '1.0.1': ['set_up_table', 'pparameter_display'],
        '1.1.2': ['set_up_table', 'pparameter_display'],
        '2.0.1': ['set_up_table', 'reproduce'],
        '2.1.2': ['set_up_table', 'reproduce'],

        //library functions
        peptide_picker: 'http://mischiefmanaged.tk/peptide_picker.js?_=1497745198870',
        shiftToMin: './js/web_main.js',
        amd_ww: './js/lib/amd_ww.3.1.0.min.js',
        enrich_kinome: './js/lib/enrich_kinome.js',
        outlier: './js/lib/quality_filtration.min.js',
        normalize_background: './js/lib/background_normalization.js',
        fit_curves: './js/lib/parameterize_curves.js',

        //webpage based stuff
        outlier_tab: './js/client/outlier.js',
        pparameter_display: 'http://mischiefmanaged.tk/pparameter_display.js',
        webpage: './js/client/webpage.js',
        set_up_table: './js/client/set_up_table.js',
        'bs_toggle-js': './js/client/general/bootstrap-toggle.min.js',
        'bs_toggle-css': 'https://gitcdn.github.io/bootstrap-toggle/2.2.2/css/bootstrap-toggle.min.css',
        reproduce: './js/client/reproducibility.js',
        fit: './js/client/fit_one.js',
        'bs_slider-js': 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-slider/9.8.0/bootstrap-slider.min.js',
        'bs_slider-css': 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-slider/9.8.0/css/bootstrap-slider.min.css',
        'peptide_picker-css': 'http://mischiefmanaged.tk/peptide_picker.css'
    };

    //set globals
    exports.KINOME = KINOME;

    //Start google tables
    // Load the Visualization API and the corechart package.
    google.charts.load('current', {packages: ['corechart']});

    //Set up the cache_db
    database = new Dexie("require_cache");
    database.version(1).stores({require_cache: 'url'});
    cache_db = database.require_cache;
    db_open = database.open();
    VERBOSE_REQ = false;

    use_cache = function (url, date) {
        var i, uuidRegex, databaseRegex, nameRegex, timeLimits, default_limit, now, useit, diff, match;
        uuidRegex = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
        databaseRegex = '\\?find=\\{"name_id":(\\{"\\$in":\\[("' + uuidRegex + '",*)+\\]\\}|' +
                '"' + uuidRegex + '")\\}';
        databaseRegex = new RegExp(databaseRegex, 'i');
        nameRegex = new RegExp(/[\s\S]+name\/*$/i);
        default_limit = 0.5 * 60 * 60 * 1000; // 1/2 hour

        now = new Date();
        diff = now - new Date(date);
        useit = false;
        match = false;

        timeLimits = [
            { //names
                limit: 24 * 60 * 60 * 1000,// 24 hours
                regex: nameRegex
            }, { // database specific
                limit: 90 * 24 * 60 * 60 * 1000, // 90 days
                regex: databaseRegex
            }, { // style
                limit: 90 * 24 * 60 * 60 * 1000, // 90 days
                regex: /\.css$/
            }
        ];

        for (i = 0; !match && i < timeLimits.length; i += 1) {
            if (url.match(timeLimits[i].regex)) {
                match = true;
                if (diff < timeLimits[i].limit) {
                    useit = true;
                }
            }
        }

        if (!match && diff < default_limit) {
            useit = true;
        }
        return useit;
    };

    reqDone = (function () {
        var waiting = [], postResolve, blocking = false;

        postResolve = function (loaded) {
            return function (val) {
                if (VERBOSE_REQ) {
                    console.log('%c resolved: ' + loaded[1], 'background: #dff0d8');
                }
                loaded[0](val); // call the resolve function
            };
        };
        return function (resolve, reject, string, prom) {
            //Add it to the stack
            var loaded, pArr;
            if (!blocking) {
                if (VERBOSE_REQ) {
                    console.log('%c Blocking Scripts.', 'background: #f98493; font-weight: bold;');
                }
                blocking = true;
            }
            waiting.push([resolve, string, prom]);

            //if the interval is not already running, start it
            prom.then(function () {
                if (Object.keys(pendingRequires).length === 0) {
                    pArr = [];
                    while (waiting.length && Object.keys(pendingRequires).length === 0) {
                        loaded = waiting.pop();
                        pArr.push(loaded[2].then(postResolve(loaded)));
                    }
                    Promise.all(pArr).then(function () {
                        blocking = false;
                        if (VERBOSE_REQ) {
                            console.log('%c Resolved Blocking.', 'background: #dff0d8; font-weight: bold;', pArr.length);
                        }
                    }).catch(function () {
                        return; //ignore this error it is resolved elsewhere
                    });
                }
            }).catch(function (err) {
                reject(err);
            });
        };
    }());


    //Leave this for now.
    KINOME.db = (function () {
        var db = new Dexie("KINOME");
        db.version(1).stores({KINOME: 'url'});
        $('#about_tab').append('<div class="text-center"><p>This tool uses IndexedDB to store data to pull it for future use. If you would like to clear that click below. (Page load times will increase signifcantly, but temporarily.)</p><button class="btn-lg btn btn-primary" onclick="KINOME.db.db.clear()">Clear Saved</button><p>Specific data queries will be saved for 90 days, the names database for 1 day and general data query results for 30 minutes.</p></div>');
        return {open: db.open(), db: db.KINOME};
    }());

    get_from_db = function (url, cache) {
        return db_open.then(function () {
            var collection = cache_db.where('url').equals(url);
            if (cache !== undefined && !cache) {
                return collection.delete();
            } else {
                return collection.toArray().then(function (res) {
                    if (res.length === 1) {
                        if (use_cache(url, res[0].time)) {
                            return res[0].text;
                        }
                    }
                    return collection.delete();
                });
            }
        });
    };

    add_to_db = function (url, data) {
        return db_open.then(function () {
            return cache_db.put({
                url: url,
                text: data,
                time: String(new Date())
            });
        });
    };

    require = function (input_str, type, cache) {
        var i, url, blocking, dt_obj, ret_promise, datafunc, pArr = [], promise_pending, unique = Math.random().toString();
        /*
            type is optional, if it is not set then the file extension will be
            used. 'js' will load javascript, 'css' will load style, 'json' will
            load data, and anything else will load as a string. If cache is set
            to false then we will clear the cache for that file. If it is set
            to true then we will use the cache as set up by IndexedDB, dexie.
        */

        /*
            !!Note: scripts do not allow IndexedDB caching and will load
            dynamically every time. This results in a more consistent behaviour
            and allows for faster development.
        */
        url = input_str;
        blocking = false; //should only be true for js.

        // deal with both arrays and default strings
        if (Array.isArray(url)) {
            input_str = "[array](" + url.length + ")" + (type
                ? " of " + type
                : "");
        } else if (defaults.hasOwnProperty(url)) {
            url = defaults[url];
        }


        if (VERBOSE_REQ) {
            console.log('%c Requesting: ' + input_str, 'background: #f98493');
        }

        //actually get started
        if (typeof url === 'string') {
            //Determine the data function from the url and type
            dt_obj = get_function_type(url, type);
            datafunc = dt_obj.func;
            blocking = dt_obj.blocking;

            //Tell the system there is a new pending promise
            if (blocking) {
                pendingRequires[unique] = 1;
            }

            //Now if we have a datafunc (nothing failed) then get going
            if (datafunc) {
                promise_pending = datafunc(url, cache);
            } else {
                promise_pending = Promise.reject('Type parameter (2nd in require function) was not recognized, valid types are: json, scrip, style, and text. This can also be a blank string and the file extension will be used.');
            }
        } else if (Array.isArray(url)) {
            //This is a series of strings, calls recursively.
            for (i = 0; i < url.length; i += 1) {
                pArr.push(require(url[i], type, cache));
            }
            //Each part of this will have to be added to the queue
            //  if we add this main one to the queue then the entire thing
            //  fails.

            //promise going back is all the queue done
            promise_pending = Promise.all(pArr).then(function (res) {
                return res;
            });
        } else {
            //Not a valide object
            promise_pending = Promise.reject('Require only accepts strings or arrays.');
        }

        //here we clear the promise pending list
        promise_pending.then(function (res) {
            delete pendingRequires[unique];
            if (VERBOSE_REQ) {
                console.log('%c Loaded: ' + input_str, 'background: #fcf8e3');
            }
            return res;
        }).catch(function (err) {
            //Even if there is an error, keep going
            delete pendingRequires[unique];
            return err;
        });

        //finally if this is blocking then set the return to the blocking promise.
        if (blocking) {
            ret_promise = new Promise(function (resolve, reject) {
                reqDone(resolve, reject, input_str, promise_pending);
            });
        //Otherwise set it to the pending promise
        } else {
            promise_pending.then(function (x) {
                if (VERBOSE_REQ) {
                    console.log('%c resolved: ' + input_str, 'background: #dff0d8');
                }
                return x;
            });
            ret_promise = promise_pending;
        }

        return ret_promise;
    };

    get_function_type = function (url, type) {
        var datafunc, blocking = false;
        if (type) {
            if (type.match(/^js$|scripts*|codes*/i)) {
                datafunc = get_script_promise;
                blocking = true;
            } else if (type.match(/json|data/i)) {
                datafunc = get_data_promise;
            } else if (type.match(/styles*|css/)) {
                datafunc = get_style_promise;
            } else if (type.match(/texts*|strings*/)) {
                datafunc = get_text_promise;
            }
        } else {
            if (url.match(/\.js\s*$/i)) {
                datafunc = get_script_promise;
                blocking = true;
            } else if (url.match(/\.css\s*$/i)) {
                datafunc = get_style_promise;
            } else if (url.match(/\.json\s*$/i)) {
                datafunc = get_data_promise;
            } else if (url.match(/\.txt\s*$/i)) {
                datafunc = get_text_promise;
            } else if (url.match(/\.jseq\s*$/i)) { //for equation objects
                datafunc = get_text_promise;
            } else {
                //default should be javascript
                datafunc = get_script_promise;
                blocking = true;
            }
        }
        return {
            func: datafunc,
            blocking: blocking
        };
    };

    get_script_promise = (function () {
        var promised = {};
        return function (url) {
            var prom;
            if (promised[url]) {
                prom = promised[url];
            } else {
                prom = jQuery.ajax({
                    url: url,
                    dataType: 'script'
                }).then(function () {
                    return true;
                });
                promised[url] = prom;
            }
            return prom;
        };
    }());

    get_text_promise = (function () {
        var promised = {};
        return function (url, cache) {
            var prom;
            if (promised[url]) {
                prom = promised[url];
            } else {
                prom = get_from_db(url, cache).then(function (res) {
                    if (typeof res === 'string') { //delete returns a # 0/1
                        // console.log(res, 'got from cache');
                        return res;
                    }
                    // console.log(res, 'got from url');
                    return jQuery.ajax({
                        url: url,
                        dataType: 'text'
                    }).then(function (res) {
                        add_to_db(url, res);
                        return res;
                    });
                });
                promised[url] = prom;
            }
            return prom;
        };
    }());

    get_data_promise = function (url, cache) {
        return get_text_promise(url, cache).then(function (res) {
            return JSON.parse(res);
        });
    };

    get_style_promise = function (url, cache) {
        return get_text_promise(url, cache).then(function (css) {
            $('<style type="text/css"></style>').html(css).appendTo('head');
            return true;
        });
    };

    require.defaults = defaults;
    exports.require = require;

    //Set up the save file function
    exports.save = (function () {
        var a = document.createElement("a");
        a.setAttribute("style", "display: none");
        document.head.appendChild(a);
        return function (data, fileName) {
            var blob = new Blob([data], {type: "octet/stream"}),
                url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
        };
    }());

    //set up other parts of the page
    KINOME.page = $('#main_page');

    pages = [
        [KINOME.page, $('#home_click')],
        [$('#about_tab'), $("#about_click").parent()]
    ];

    pages.hide = function () {
        this.map(function (x) {
            x[0].hide();
            x[1].removeClass('active');
        });
        $('#menu-drop-active').removeClass('active');
    };

    pages.show = function (i) {
        var page = pages[i];
        page[0].show({
            duration: 0,
            complete: function () {
                if (page[0].thisShow) {
                    page[0].thisShow();
                }
            }
        });
        page[1].addClass('active');
        if (i > 1) {
            $('#menu-drop-active').addClass('active');
        }
    };

    //make the nav bar behave differently
    $('.toHome').click(function (evt) {
        evt.preventDefault();
        pages.hide();
        pages.show(0);
    });

    //make the nav bar behave differently
    $('#about_click').click(function (evt) {
        evt.preventDefault();
        pages.hide();
        pages.show(1);
    });

    KINOME.addAnalysis = function (title) {
        //We need to add this to the list of avaliable, and set up a page for it.

        //Create a new tab for this
        var ret, li, a, index, tabID = Math.random().toString().replace(/0\./, '');

        index = pages.length;

        ret = $('<div>', {
            class: "container",
            style: "display: none",
            id: 'div' + tabID
        }).appendTo('body');
        li = $('<li>');
        a = $('<a>', {
            href: '#',
            text: title
        }).click(function (evt) {
            evt.preventDefault();
            pages.hide();
            pages.show(index);
        });

        $('#analysesMenu').append(li.append(a));

        ret.onshow = function (myFunc) {
            ret.thisShow = function () {
                myFunc();
                ret.thisShow = function () {
                    return;
                };
                return;
            };
        };
        pages.push([ret, li]);

        return ret;
    };

    KINOME.error = function (err, msg) {
        //display an error message... Need to add in some more options...
        console.error(err, msg);
        if (msg !== undefined) {
            $('#status').append(
                '<div class="alert alert-danger alert-dismissable fade in">Error: ' + msg + '<a href="#" class="close" data-dismiss="alert"'
                + ' aria-label="close">&times;</a></div>'
            );
        }
    };

    KINOME.get = function (get_object) {
        //make sure this is initialized
        get_object = get_object || {};

        //Need to flush this out, start with just getting by level
        var level, out = [], id_filter = get_object.id, groupFilter = get_object.group, sample_name;
        level = get_object.level !== undefined
            ? get_object.level
            : "[\\s\\S]*";
        level = new RegExp(level, 'i');
        sample_name = get_object.name !== undefined
            ? get_object.name
            : "[\\s\\S]*";
        sample_name = new RegExp(sample_name, 'i');

        //Now move through the object grabbing things
        KINOME.params.data.map(function (group, groupInd) {
            group.value.map(function (samp) {
                if (
                //Body of the filter is right here
                    //matches the level string
                    samp.level.match(level) &&

                    //matches the group index
                    (groupFilter === undefined || groupInd === groupFilter) &&

                    //matches the name
                    samp.name.match(sample_name) &&

                    //matches the id
                    (id_filter === undefined || id_filter === samp.name_id)
                ) {
                    if (!samp.hasOwnProperty('group')) {
                        Object.defineProperty(samp, 'group', {value: groupInd, enumerable: false});
                    }
                    out.push(samp);
                }
            });
        });
        return KINOME.enrich(out);
    };

    KINOME.list = function (list_str) {
        //make sure this is initialized\
        // keep things compatible for now

        list_str = list_str || "";
        if (typeof list_str !== 'string') {
            list_str = "";
            console.warn('list should only be passed a string');
        }

        var groups = [], ids = [], names = [], levelsObj = {}, levels = [];
        //Now move through the object grabbing things
        KINOME.params.data.map(function (group, groupInd) {
            groups.push(groupInd);
            group.value.map(function (samp) {
                levelsObj[samp.level] = 1;
                names.push(samp.name);
                ids.push(samp.name_id);
            });
        });
        levels = Object.keys(levelsObj);
        return list_str === ""
            ? {levels: levels, names: names, ids: ids, groups: groups}
            : list_str.match(/level/i)
                ? levels
                : list_str.match(/name/i)
                    ? names
                    : list_str.match(/group/i)
                        ? groups
                        : [];
    };
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : window
));
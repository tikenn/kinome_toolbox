/*global M Dexie KINOME module google Blob jQuery save ID $ window*/
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
            db_open, VERBOSE_REQ, get_from_cached, uuid, ID, local_database, jagax;

    defaults = {
        name: ['set_up_table', 'fully_parse'],
        '1.0.0': ['set_up_table', 'outlier_tab', 'level_1_build'],
        '1.0.1': ['set_up_table', 'level_1_build', 'normalize_background_tab'],
        '1.1.2': ['set_up_table', 'level_1_build'],
        '2.0.1': ['set_up_table', 'measurement-reproducibility', 'reproduce', 'anova', 'heatmap'],
        '2.1.2': ['set_up_table', 'measurement-reproducibility', 'reproduce', 'anova', 'heatmap'],

        //library functions
        peptide_picker: './plugins/peptide_picker/peptide_picker.js',
        shiftToMin: './js/web_main.js',
        amd_ww: './js/lib/amd_ww/amd_ww.3.1.0.min.js',
        enrich_kinome: './js/lib/enrich_kinome.js',
        outlier: './js/lib/quality_filtration.min.js',
        normalize_background: './js/lib/background_normalization.js',
        fit_curves: './js/lib/parameterize_curves.js',

        //general
        webpage: './js/client/webpage.js',
        set_up_table: './js/client/set_up_table.js',

        //plugins - visual
        level_1_build: './plugins/level_1_display/level_1_build.js',
        'img-picker': './plugins/img_picker/img_picker.js',
        'equation-picker': './js/client/plugins/equation_picker.js',

        //plugins - math
        fit: './js/client/plugins/fit_one/fit_one.js',
        hcluster: './plugins/heat_map/hcluster.js',
        gradient: './plugins/gradient/gradient.js',

        //tabs
        fully_parse: './js/client/tabBuilders/fully_parse_file.js',
        outlier_tab: './js/client/tabBuilders/outlier.js',
        normalize_background_tab: './js/client/tabBuilders/normalize_background.js',
        level_1_display: './plugins/level_1_display/level_1_display.js',
        reproduce: './js/client/tabBuilders/reproducibility.js',
        anova: './js/client/tabBuilders/anova.js',
        heatmap: './plugins/heat_map/heat_map.js',
        'measurement-reproducibility': './js/client/tabBuilders/measurementReproduce.js',

        //other
        'bs_toggle-js': './js/client/general/bootstrap-toggle.min.js',
        'bs_toggle-css': 'https://gitcdn.github.io/bootstrap-toggle/2.2.2/css/bootstrap-toggle.min.css',
        d3: './js/client/general/d3.min.js',
        'bs_slider-js': './js/client/general/bootstrap-slider.min.js',
        'bs_slider-css': 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-slider/9.8.0/css/bootstrap-slider.min.css',
        'peptide_picker-css': './plugins/peptide_picker/peptide_picker.css'

        //data
        // tb_paper1: 'http://138.26.31.155:8000/db/kinome/lvl_2.0.1?find={"name_id":{"$in":["4a39ff16-2322-4037-8912-91a8d0c16921","b9dc1baa-5a54-4785-b4ca-d6e5ecca8982","35df93bf-8a1e-4f12-a76a-1835de02e0bf"]}}',
        // tb_paper2: 'http://138.26.31.155:8000/db/kinome/lvl_2.0.1?find={"name_id":{"$in":["d23a15e2-082d-4896-b1c4-e808c731dda2","588ba377-4b75-43a8-b4e8-e39c35d3024d","22703a41-4064-4d6f-8939-20586409428b"]}}',
        // tb_paper3: 'http://138.26.31.155:8000/db/kinome/lvl_2.0.1?find={"name_id":{"$in":["fa7fadd6-e3eb-475d-a8a9-393f0b70cc73","1208b67c-3109-4b8f-bb4a-bc4b96b0c20a","81941543-ad28-450f-a788-b75437ac72c5"]}}',
        // tb_paper4: 'http://138.26.31.155:8000/db/kinome/lvl_2.0.1?find={"name_id":{"$in":["ece0ab9c-4a2a-4fd2-ac63-fc0fa72c988a","0e564f09-e2d8-4d6c-98bd-d297950b757c","1c95945b-7f63-4e4a-a92b-63c7a081d42f"]}}'
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
    ID = '_id';

    //Set up the local cache_db of data
    local_database = {
        dexie_db: new Dexie("kinome"),
        //these must be predefined, if changed must increment version number
        collections: {
            'name': '',
            'lvl_1.0.0': '',
            'lvl_1.0.1': '',
            'lvl_1.1.2': '',
            'lvl_2.0.1': '',
            'lvl_2.1.2': ''
        },
        get: function (collection, id) {
            var that = this;

            //If the database has been opened, then return the collection and
            // add the object
            return that.collections[collection].then(function (db) {
                if (id === undefined) {
                    return db.toArray();
                } else {
                    return db.where('_id').equals(id).toArray();
                }
            });
        },
        upsert: function (collection, object) {
            var that = this;

            //If the database has been opened, then return the collection and
            // add the object
            return that.collections[collection].then(function (db) {
                if (object[ID] !== undefined) {
                    object[ID] = object[ID].toString();
                } else {
                    object[ID] = uuid();
                }
                return db.put(object).then(function () {
                    return true;
                });
            });
        }
    };

    //Set up the local data base
    (function () {
        var storeObj = {}, storeKeys = Object.keys(local_database.collections),
                startProm;
        storeKeys.map(function (key) {
            //name and some others are protected, so we need to add something
            storeObj['$' + key] = "_id";
        });
        local_database.dexie_db.version(1).stores(storeObj);
        startProm = local_database.dexie_db.open();
        storeKeys.map(function (collection) {
            local_database.collections[collection] = startProm.then(function () {
                return local_database.dexie_db['$' + collection];
            });
        });
    }());

    use_cache = function (url, date) {
        var i, uuidRegex, databaseRegex, nameRegex, timeLimits, default_limit, now, useit, diff, match;
        uuidRegex = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
        databaseRegex = '\\?find=\\{"name_id":(\\{"\\$in":\\[("' + uuidRegex + '",*)+\\]\\}|' +
                '"' + uuidRegex + '")\\}|' + uuidRegex + '$';
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
        // return false; // turns cache off
        return useit;
    };

    reqDone = (function () {
        var waiting = [], postResolve, blocking = false;

        postResolve = function (loaded) {
            return function () {
                return loaded[2].then(function (val) {
                    if (VERBOSE_REQ) {
                        console.log('%c resolved: ' + loaded[1], 'background: #dff0d8');
                    }
                    if (typeof val === 'function') {
                        loaded[0](val());
                    } else {
                        loaded[0](val);
                    }
                    return true;
                });
            };
        };
        return function (resolve, reject, string, prom, func) {
            //Add it to the stack
            var loaded;
            if (!blocking) {
                if (VERBOSE_REQ) {
                    console.log('%c Blocking Scripts.', 'background: #f98493; font-weight: bold;');
                }
                blocking = true;
            }
            if (func) {
                waiting.unshift([resolve, string, prom]);
            } else {
                waiting.push([resolve, string, prom]);
            }

            //if the interval is not already running, start it
            prom.then(function () {
                var pChain;
                if (Object.keys(pendingRequires).length === 0 && waiting.length) {
                    pChain = Promise.resolve(); // start chain

                    while (waiting.length) {
                        loaded = waiting.pop();
                        pChain = pChain.then(postResolve(loaded));
                    }

                    pChain.then(function () {
                        blocking = false;
                        if (VERBOSE_REQ) {
                            console.log('%c Resolved Blocking.', 'background: #dff0d8; font-weight: bold;');
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


    //Leave this for now. Clears cache
    // KINOME.db = (function () {
    //     var db = new Dexie("KINOME");
    //     db.version(1).stores({KINOME: 'url'});
    //     $('#about_tab').append('<div class="text-center"><p>This tool uses IndexedDB to store data to pull it for future use. If you would like to clear that click below. (Page load times will increase signifcantly, but temporarily.)</p><button class="btn-lg btn btn-primary" onclick="KINOME.db.db.clear()">Clear Saved</button><p>Specific data queries will be saved for 90 days, the names database for 1 day and general data query results for 30 minutes.</p></div>');
    //     return {open: db.open(), db: db.KINOME};
    // }());
    KINOME.formatEquation = M.sToMathE;


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

    jagax = function (object) {
        return new Promise(function (resolve, reject) {
            jQuery.ajax(object).then(function (res) {
                resolve(res);
            }, function (err) {
                reject(err);
            });
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
        var i, url, blocking, dt_obj, func = false, ret_promise, datafunc, pArr = [], promise_pending, unique = Math.random().toString();
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
            if (typeof url === 'function') {
                console.log('%c Requesting a function call', 'background: #f98493');
            } else {
                console.log('%c Requesting: ' + input_str, 'background: #f98493');
            }
        }

        //actually get started
        if (typeof url === 'string') {
            //Determine the data function from the url and type
            dt_obj = get_function_type(url, type);
            datafunc = dt_obj.func;
            blocking = dt_obj.blocking;

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
        } else if (typeof url === 'function') {
            //This is the only actual timeout in here, essentially we do not
                // want this to fire immediately in case other requires are
                // called after this. This allows require(callback) require(a)
                // require(b) to work most of the time.
            blocking = true;
            func = true;
            input_str = "function"; //for printing
            promise_pending = new Promise(function (resolve) {
                setTimeout(function () {
                    resolve(url);
                }, 200);
            });
        } else {
            //Not a valide object
            promise_pending = Promise.reject('Require only accepts strings, arrays or callback functions.');
        }

        //Tell the system there is a new pending promise
        if (blocking) {
            pendingRequires[unique] = 1;
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
                reqDone(resolve, reject, input_str, promise_pending, func);
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
            if (type.match(/^js$|scripts*|codes*/im)) {
                datafunc = get_script_promise;
                blocking = true;
            } else if (type.match(/json|data/i)) {
                datafunc = get_data_promise;
            } else if (type.match(/styles*|css/)) {
                datafunc = get_style_promise;
            } else if (type.match(/txts*|texts*|strings*/)) {
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

    get_from_cached = function (url) {
        //ignores the cache param that is passed in, this grabs the data from
        // the local cache...

        //break up
        var queries = url.split(/[?&]+/);
        url = queries.shift();
        var urlParts = url.split(/[\/:]+/);
        urlParts.shift(); //get rid of local:// or local:

        //get collection and id
        var collection = urlParts.shift();
        var id = urlParts.shift();

        //for now ignore queries
        if (queries.length) {
            console.warn('Sorry local does not support queries at this time. You may search by collection and id only.');
        }

        //get actual data
        return local_database.get(collection, id).then(function (d) {
            //console.log('got from database', d, collection, id);
            return d;
        });
    };

    get_script_promise = (function () {
        var promised = {};
        return function (url) {
            var prom;
            if (promised[url]) {
                prom = promised[url];
            } else {
                prom = jagax({
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
                    return jagax({
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
        //Here is the local:// magic
        if (url.match(/^local\:/)) {
            return get_from_cached(url, cache).then(function (res) {
                //Already an array at this point, no need to parse
                return res;
            });
        }
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
        [$('#8283479327500567'), $('#22225356192030654')],
        [$('#about_tab'), $("#about_click").parent()],
        [KINOME.page, $('#5948670235572466').parent()]
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
        if (i > 2) {
            $('#menu-drop-active').addClass('active');
        }
    };

    //make the nav bar behave differently
    $('#22225356192030654').click(function (evt) {
        evt.preventDefault();
        pages.hide();
        pages.show(0);

    });

    $('#5948670235572466').click(function (evt) {
        evt.preventDefault();
        pages.hide();
        pages.show(2);
    });

    //make the nav bar behave differently
    $('#about_click').click(function (evt) {
        evt.preventDefault();
        pages.hide();
        pages.show(1);
    });

    uuid = function () {
        var a, b, p;
        a = 1;
        b = '';
        while (a < 37) {
            p = a ^ 15
                ? 8 ^ Math.random() * (
                    a ^ 20
                        ? 16
                        : 4
                )
                : 4;
            b += a * 51 & 52
                ? p.toString(16)
                : '-';
            a += 1;
        }
        return b;
    };

    //store this as part of require to make it easier to find.
    require.database = local_database;

    require.store = function (collection, value) {
        return local_database.upsert(collection, value);
    };

    KINOME.addAnalysis = function (title) {
        //We need to add this to the list of avaliable, and set up a page for it.

        //Create a new tab for this
        var ret, li, a, index, tabID = Math.random().toString().replace(/0\./, '');

        index = pages.length;

        //append a clear left
        $('<div>', {style: 'clear: left;'}).appendTo('body');

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
            var alertBox = $('<div class="alert alert-danger alert-dismissable fade in"></div>');
            var dismiss = $('<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a></div>');
            var row = $('<div>', {
                class: 'row'
            });
            var col1 = $('<div>', {
                class: 'col col-xs-10 col-sm-11',
                html: '<span>Error:&nbsp;</span>'
            });
            var col2 = $('<div>', {
                class: 'col col-xs-2 col-sm-1'
            });
            col1.append(msg);
            col2.append(dismiss);
            row.append(col1).append(col2);
            alertBox.append(row);

            $('#status').append(alertBox);
        }
    };

    KINOME.warn = function (div) {
        var mainDiv = $('<div style="display: table;width:100%;" class="alert alert-warning alert-dismissable fade in"></div>');
        var thisdiv = $('<div>', {style: "display: table-cell; vertical-align: middle;", class: "row"}).appendTo(mainDiv);
        thisdiv.append($('<div>', {
            class: 'col col-xs-10 col-sm-11'
        }).append(div))
            .append($('<div>', {
                class: 'col col-xs-2 col-sm-1'
            }).append('<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a></div>'));
        $('#status').append(mainDiv);
        return mainDiv;
    };

    var alerting = false;
    $('#KINOME-modal-div').on('hide.bs.modal', function () {
        alerting = false;
    });
    $('#KINOME-modal-div').on('hidden.bs.modal', function () {
        //If a new alert showed up while the modal was closing.
        if (alerting) {
            $('#KINOME-modal-div').modal('show');
        }
    });
    KINOME.alert = function (msg) {
        $('#KINOME-alert-text').empty().append(msg);
        if (!alerting) {
            alerting = true;
            $('#KINOME-modal-div').modal('show');
        }
        //Make sure any message shows up for at least 3/4 second
        setTimeout(function () {
            if (!alerting) {
                alerting = true;
                $('#KINOME-modal-div').modal('show');
            }
        }, 1000);
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
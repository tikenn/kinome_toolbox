/*global KINOME module google Blob jQuery save ID $ window*/
/*

This creates the require function for the browser. Essentially this will only
be loaded if you are in the browser enviornment, it is meant to allow code to
be written for both enviornments. You will have to add things to the defaults
list though in order for it to work properly. If you are just loading things in
as urls this works by assuming jQuery is present and that Promises exist

*/

(function (exports) {
    'use strict';

    var reqDone, get_text_promise, require, defaults, get_script_promise, pages, KINOME = {}, pendingRequires = {};

    defaults = {
        levels: {
            name: ['./js/client/set_up_table.js'],
            '1.0.0': ['./js/client/set_up_table.js', './js/client/outlier.js', 'http://mischiefmanaged.tk/pparameter_display.js'],
            '1.0.1': ['./js/client/set_up_table.js', 'http://mischiefmanaged.tk/pparameter_display.js'],
            '1.1.2': ['./js/client/set_up_table.js', 'http://mischiefmanaged.tk/pparameter_display.js']
        },
        //library functions
        shiftToMin: './js/web_main.js',
        amd_ww: './js/lib/amd_ww.3.1.0.min.js',
        enrich_kinome: './js/lib/enrich_kinome.js',
        outlier: './js/lib/quality_filtration.min.js',
        normalize_background: './js/lib/background_normalization.js',
        fit_curves: './js/lib/parameterize_curves.js',

        //webpage based stuff
        webpage: './js/client/webpage.js',
        set_up_table: './js/client/set_up_table.js'
    };

    //set globals
    exports.KINOME = KINOME;

    //Start google tables
    // Load the Visualization API and the corechart package.
    google.charts.load('current', {packages: ['corechart']});

    reqDone = (function () {
        var waiting = [], postResolve;

        postResolve = function (loaded) {
            return function (val) {
                console.log('%c resolved: ' + loaded[1], 'background: #dff0d8');
                loaded[0](val);
            };
        };
        return function (resolve, string, prom) {
            //Add it to the stack
            var loaded, pArr;
            waiting.push([resolve, string, prom]);

            //if the interval is not already running, start it
            prom.then(function () {
                if (Object.keys(pendingRequires).length === 0) {
                    pArr = [];
                    while (waiting.length && Object.keys(pendingRequires).length === 0) {
                        loaded = waiting.pop();
                        pArr.push(loaded[2].then(postResolve(loaded)));
                    }
                    if (waiting.length === 0 && Object.keys(pendingRequires).length === 0) {
                        Promise.all(pArr).then(function () {
                            //running = false;
                            console.log('%c Resolved All.', 'background: #dff0d8; font-weight: bold;');
                            // clearInterval(interval);
                        });
                    }
                }
            });
        };
    }());

    require = function (string, text) {
        var url = string, i, pArr = [], ps, unique = Math.random().toString();

        /*
            type is optional, if it is set to true then it will return text
            rather than evaluating a script. This could be used for data or
            even as style as well. I would not reccomend style since they
            do not have to load for the page to work.
        */
        pendingRequires[unique] = string;
        if (text) {
            if (require.defaults.hasOwnProperty(string)) {
                url = require.defaults[string];
            }
            ps = new Promise(get_text_promise(url));
        } else if (typeof string === 'string') {
            if (require.defaults.hasOwnProperty(string)) {
                url = require.defaults[string];
            }
            ps = new Promise(get_script_promise(url));
        } else if (typeof string === 'object') {
            if (require.defaults.levels.hasOwnProperty(string.type)) {
                for (i = 0; i < require.defaults.levels[string.type].length; i += 1) {
                    pArr.push(require(require.defaults.levels[string.type][i]));
                }
                delete pendingRequires[unique];
                return Promise.all(pArr); //end early
            }
        }
        console.log('%c Requesting: ' + string, 'background: #f98493');
        ps.then(function (val) {
            console.log('%c Loaded: ' + string, 'background: #fcf8e3');
            delete pendingRequires[unique];
            if (text) {
                return val;
            }
            return true;
        }).catch(function (err) {
            KINOME.error(err, 'Failed to load require:' + string);
        });

        return new Promise(function (resolve) {
            reqDone(resolve, string, ps);
        });
    };

    get_script_promise = function (url) {
        // console.log(url);
        return function (resolve, reject) {
            jQuery.ajax({
                url: url,
                dataType: 'script',
                success: resolve,
                error: reject
            });
        };
    };
    get_text_promise = function (url) {
        // console.log(url);
        return function (resolve, reject) {
            jQuery.ajax({
                url: url,
                dataType: 'text',
                success: resolve,
                error: reject
            });
        };
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

    KINOME.list = function (get_object) {
        //Need to flush this out, start with just getting by level
        var level = new RegExp(get_object.level, "i"), out = [];
        KINOME.params.data.map(function (group, groupInd) {
            group.value.map(function (samp) {
                var final, url = samp.data_origin_url;
                if (samp.level.match(level)) {
                    if (typeof samp.clone === 'function') {
                        final = samp.clone();
                    } else {
                        final = JSON.parse(JSON.stringify(samp));
                        Object.defineProperty(final, 'data_origin_url', {
                            enumerable: false,
                            configurable: false,
                            writable: false,
                            value: url
                        });
                    }
                    Object.defineProperty(final, 'group', {value: groupInd, enumerable: false});
                    out.push(final);
                }
            });
        });
        return out;
    };
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : window
));
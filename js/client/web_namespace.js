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

    var require, defaults, get_script_promise, pages, KINOME = {};

    defaults = {
        levels: {
            name: ['./js/client/set_up_table.js'],
            '1.0.0': ['./js/client/outlier.js']
        },
        //library based stuff
        shiftToMin: './js/web_main.js',
        amd_ww: './js/lib/amd_ww.3.1.0.min.js',
        enrich_kinome: './js/lib/enrich_kinome.min.js',
        outlier: './js/lib/quality_filtration.min.js',

        //webpage based stuff
        webpage: './js/client/webpage.js',
        set_up_table: './js/client/set_up_table.js'
    };

    //set globals
    exports.KINOME = KINOME;

    //Start google tables
    // Load the Visualization API and the corechart package.
    google.charts.load('current', {packages: ['corechart']});

    require = function (string) {
        var url = string, i, pArr = [];
        if (typeof string === 'string') {
            if (require.defaults.hasOwnProperty(string)) {
                url = require.defaults[string];
            }
            return new Promise(get_script_promise(url));
        }
        if (typeof string === 'object') {
            if (require.defaults.levels.hasOwnProperty(string.type)) {
                for (i = 0; i < require.defaults.levels[string.type].length; i += 1) {
                    pArr.push(new Promise(
                        get_script_promise(
                            require.defaults.levels[string.type][i]
                        )
                    ));
                }
                return Promise.all(pArr);
            }
        }
    };

    get_script_promise = function (url) {
        console.log(url);
        return function (resolve, reject) {
            jQuery.ajax({
                url: url,
                dataType: 'script',
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
        document.head.appendChild(a);
        a.style = "display: none";
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
        page[0].show();
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
        pages.push([ret, li]);

        return ret;
    };

    KINOME.error = function (err) {
        //display an error message... Need to add in some more options...
        console.error(err);
        $('#status').append(
            '<div class="alert alert-danger alert-dismissable fade in">' + err + '<a href="#" class="close" data-dismiss="alert"'
            + ' aria-label="close">&times;</a></div>'
        );
    };

    KINOME.get = function (get_object) {
        //Need to flush this out, start with just getting by level
        var level = get_object.level, out = [];
        KINOME.params.data.map(function (group) {
            group.value.map(function (samp) {
                if (samp.level === level) {
                    out.push(samp);
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
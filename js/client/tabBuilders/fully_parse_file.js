/*global KINOME module google jQuery save $ window amd_ww*/
(function () {
    'use strict';

    //This is loosely based on index.js. It will parse a file client side and
    // store it in a database and download everything.

    //My packages
    require('./js/lib/parse_kinome_and_background.js');
    require('./js/lib/enrich_kinome.js');
    require('./js/lib/quality_filtration.js');
    require('./js/lib/background_normalization.js');
    require('amd_ww');
    require('./js/lib/parameterize_curves.js');
    require('level_1_display');
    require('set_up_table');

    //model url
    var non_linear_model = './models/cyclingEq_3p_hyperbolic.jseq'; //references from main

    //workers
    var fitCurvesWorker = './js/lib/fitCurvesWorker.js';
    var normalize_background_worker = './js/lib/normalize_background_worker.js';
    var div = KINOME.addAnalysis('Parse Local Files');

    require(function () {
        var wait, signalFileName, log, fit101, fit112, normalizeBackground, enrich_data, parseFiles, file_select, parse_and_proccess, files_selected = {}, loadFile, barBuilder, find_outliers;


        file_select = function (type) {
            return function (evt) {
                evt.preventDefault();
                var that = $(this);
                files_selected[type] = evt.target.files[0]; //Only get the first file
                if (evt.target.files.length) {
                    that.addClass('disabled');
                    that.find('input').remove();
                    that.unbind('click');
                }
                if (files_selected.signal && files_selected.background) {
                    return parse_and_proccess();
                }
                return false;
            };
        };

        log = function (d) {
            console.log(d);
            return d;
        };

        wait = function (val) {
            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve(val);
                }, 1000);
            });
        };

        //builds loading bar
        barBuilder = function (msg) {
            div.append('<p class="text-center">' + msg + '</p>');
            var bar = $('<div>', {
                class: "progress-bar",
                role: "progressbar",
                'aria-valuenow': "0",
                "aria-valuemin": "0",
                "aria-valuemax": "100",
                style: "width: 0%"
            }).appendTo($('<div class="progress"></div>').appendTo(div));
            return function (counts) {
                var interval, percent;
                interval = setInterval(function () {
                    if (counts.done === counts.total) {
                        clearInterval(interval);
                    }
                    percent = counts.done / counts.total * 100;
                    percent = percent.toFixed(2);
                    bar.attr('aria-valuenow', percent);
                    bar.attr('style', "width: " + percent + "%");
                    bar.text(percent + "%");
                }, 100);
            };
        };

        find_outliers = function (data) {
            var filterPromise = KINOME.filter({
                data: data['1.0.0'],
                amd_ww: amd_ww,
                equation: non_linear_model,
                worker: fitCurvesWorker,
                number_threads: 4,
                linearUpdate: barBuilder('Finding outliers: Linear Fits'),
                kineticUpdate: barBuilder('Finding outliers: Kinetic Fits')
            });
            return filterPromise.then(function (res) {
                data['1.0.1'] = KINOME.enrich(res);
                return data;
            });
        };

        loadFile = function (file) {
            return new Promise(function (resolve, reject) {
                var reader = new FileReader();
                reader.onload = function (evt) {
                    resolve(evt.target.result);
                };
                reader.onerror = reject;
                reader.readAsText(file);
            });
        };

        enrich_data = function (data_obj) {
            console.log(data_obj);
            data_obj.name = KINOME.enrich(data_obj.name);
            data_obj['1.0.0'] = KINOME.enrich(data_obj['1.0.0']);
            return data_obj;
        };

        parseFiles = function (files) {
            var combinedArrays = KINOME.parse({
                signal: {
                    data: files[0],
                    filename: files_selected.signal.name
                },
                background: {
                    data: files[1],
                    filename: files_selected.background.name
                }
            });
            signalFileName = files_selected.signal.name;
            div.append('<p class="text-center">Files Parsed!</p>');

            //Shortened the amount of data for testing
            // combinedArrays.name = combinedArrays.name.slice(0, 2);
            // combinedArrays['1.0.0'] = combinedArrays['1.0.0'].slice(0, 2);
            return combinedArrays;
        };

        var ddJSON = false;
        var filesKeys = ['name', '1.0.0', '1.0.1', '1.1.2', '2.0.1', '2.1.2'];
        var downloadJSON = function (data) {
            var fileBase, i;
            if (!ddJSON) { // This can only occur once.
                ddJSON = true;
                fileBase = signalFileName.replace(/\.[\S\s]{0,4}$/, '');
                for (i = 0; i < filesKeys.length; i += 1) {
                    save(data[filesKeys[i]].stringify(), fileBase + '_' + filesKeys[i] + '.json');
                }
            }
        };

        var ddMONGO = false;
        var downloadMONGO = function (data) {
            var fileBase, i, stringifyInd;
            stringifyInd = function (x) {
                return x.stringify();
            };
            if (!ddMONGO) { // This can only occur once.
                ddMONGO = true;
                fileBase = signalFileName.replace(/\.[\S\s]{0,4}$/, '');
                for (i = 0; i < filesKeys.length; i += 1) {
                    save(data[filesKeys[i]].map(stringifyInd).join('\n'), fileBase + '_' + filesKeys[i] + '.mdb');
                }
            }
        };

        var ddLOCAL = false;
        var saveToLocal = function (data) {
            var i, j, collection, pChain = Promise.resolve(), thenSave;
            thenSave = function (collection, dataObj) {
                return function () {
                    //parse the string to clear it of functions
                    return require.store(collection, JSON.parse(dataObj.stringify()));
                };
            };
            KINOME.alert('Saving to local storage, do not exit this page or refresh. This can take quite a while depending on the number of samples provided.');
            if (!ddLOCAL) { // This can only occur once.
                ddLOCAL = true;
                //In theory these can go all at one time, but Dexie seems very
                // unstable sending a large number of requests at once. This is
                // hopefully more stable. Even if it does take a lot longer.
                for (i = 0; i < filesKeys.length; i += 1) {
                    collection = filesKeys[i] === 'name'
                        ? 'name'
                        : 'lvl_' + filesKeys[i];
                    for (j = 0; j < data[filesKeys[i]].length; j += 1) {
                        pChain = pChain.then(thenSave(collection, data[filesKeys[i]][j]));
                    }
                }
                console.log(pChain);
                pChain.then(function () {
                    console.log('saved....');
                    return KINOME.loadData('local://name');
                }).then(function () {
                    console.log('loaded again....');
                    KINOME.updateMainTable(KINOME.get({level: 'name'}), 'name');
                    KINOME.alert('Saving is complete, feel free to navigate as normal.');
                });
            }
        };

        fit101 = function (data) {
            return KINOME.parameterize({
                data: data['1.0.1'],
                amd_ww: amd_ww,
                equation: non_linear_model,
                worker: fitCurvesWorker,
                number_threads: 4,
                update: barBuilder('Building lvl 2.0.1')
            }).then(function (res) {
                data['2.0.1'] = KINOME.enrich(res);
                return data;
            });
        };

        fit112 = function (data) {
            return KINOME.parameterize({
                data: data['1.1.2'],
                amd_ww: amd_ww,
                equation: non_linear_model,
                worker: fitCurvesWorker,
                number_threads: 4,
                update: barBuilder('Building lvl 2.1.2')
            }).then(function (res) {
                data['2.1.2'] = KINOME.enrich(res);
                return data;
            });
        };

        normalizeBackground = function (data) {
            console.log(data);
            var normalizePromise = KINOME.normalize_background({
                data: data['1.0.1'],
                amd_ww: amd_ww,
                worker: normalize_background_worker,
                number_threads: 4,
                update: barBuilder('Normalizing Background')
            });

            return normalizePromise.then(function (data_out) {
                data['1.1.2'] = KINOME.enrich(data_out);
                console.log(data);
                return data;
            });
        };

        parse_and_proccess = function () {
            var filePromises = [
                loadFile(files_selected.signal),
                loadFile(files_selected.background),
                require(non_linear_model).then(function (str) { //get the model here too
                    non_linear_model = str.replace(/\/\/[^\n]*/g, "").replace(/\s+/g, ' ');
                })
            ];

            div.append('<p class="text-center">Parsing Files, this can take a while depending on the file sizes.</p>');
            return Promise.all(filePromises)
                .then(wait)
                .then(parseFiles)
                .then(wait)
                .then(enrich_data)
                .then(wait)
                .then(find_outliers)
                .then(wait)
                .then(normalizeBackground)
                .then(wait)
                .then(fit101)
                .then(log)
                .then(wait)
                .then(fit112)
                .then(wait)
                .then(log)
                .then(function (data) {
                    div.append('<h1>Level 1.0.1 Data</h1>');
                    div.append('<p class="text-center">We are showing you your level 1.0.1 data to make sure that it looks correct. Once you verify that it does please go the the bottom of the page to save the data locally and download it for your own purposes.</p>');
                    KINOME.levelOneDisplay(data['1.0.1']).appendTo(div);
                    var buttons = $('<div class="row text-center"></div>').appendTo(div);
                    $('<button>', {
                        class: 'btn btn-lg btn-primary',
                        html: '<span>Download JSON Files</span>'
                    }).click(function () {
                        downloadJSON(data);
                    }).appendTo($('<div class="col col-sm-4 col-xs-12"></div>').appendTo(buttons));
                    $('<button>', {
                        class: 'btn btn-lg btn-primary',
                        html: '<span>Download MongoDB Files</span>'
                    }).click(function () {
                        downloadMONGO(data);
                    }).appendTo($('<div class="col col-sm-4 col-xs-12"></div>').appendTo(buttons));
                    $('<button>', {
                        class: 'btn btn-lg btn-primary',
                        html: '<span>Save Data To Local Storage</span>'
                    }).click(function () {
                        saveToLocal(data);
                    }).appendTo($('<div class="col col-sm-4 col-xs-12"></div>').appendTo(buttons));
                });
        };

        //description at top
        div.append('<p class="text-center">This tool allows you to process your own bionavigator files. It will parse them locally and store them in the semi-persistant IndexDB. As long as this is a private computer this will protect your data and will no data will be shared. This data will disappear if you clear your cache, and only exists on this computuer. Even though we provide this tool, we recommend you download parsed data and create a database with it, or ask us to add your data to our public repository. (See About) Keep scrolling down to see the results. As more is done more will show up. At the end there will be buttons that will allow you to download or store your data locally.</p>');

        //buttons to get data files
        var btn_signal = $('<span>', {
            class: 'btn btn-primary btn-lg btn-file',
            html: 'Select Median Signal File<input class="computerFile" type="file">'
        }).appendTo($('<div class="text-center" style="margin:15px;"></div>').appendTo(div));
        var btn_background = $('<span>', {
            class: 'btn btn-primary btn-lg btn-file',
            html: 'Select Median Background File<input class="computerFile" type="file">'
        }).appendTo($('<div class="text-center" style="margin:15px;"></div>').appendTo(div));

        btn_signal.change(file_select('signal'));
        btn_background.change(file_select('background'));
    });


    return [fitCurvesWorker, div];
}());
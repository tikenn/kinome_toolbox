//My packages
var parser = require('./js/lib/parse_kinome_and_background.js'),
    add_get = require('./js/lib/enrich_kinome.js').enrich,
    filter = require('./js/lib/quality_filtration.js').filter,
    normalize = require('./js/lib/background_normalization.js').normalize_background,
    amd_ww = require('amd_ww').amd_ww, //This requires webworker-threads
    parameterize = require('./js/lib/parameterize_curves.js').parameterize;

//Requirements
var fs = require('fs'),
    prompt = require('prompt'),
    myArgs = require('optimist').argv,
    colors = require('colors'),
    ProgressBar = require('progress'),
    MongoClient = require('mongodb').MongoClient;

//Functions
var timeoutPromise, writeMongoPromise, runanalyses, readFiles, parse_equation, stringify, writeFilePromise;

//model url
var model = './models/cyclingEq_3p_hyperbolic.jseq'; //references from main

//workers
var fitCurvesWorker = './js/lib/fitCurvesWorker.js';
var normalizeWorker = './js/lib/normalize_background_worker.js';

//file out path
var fout = "", databaseForMongo = "";

//define fuctions
(function () {
    'use strict';

    writeFilePromise = function (data, filename) {
        return new Promise(function (resolve, reject) {
            fs.writeFile(fout + filename, data, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    };

    timeoutPromise = function (d) {
        return new Promise(function (resolve) {
            setTimeout(function () {
                resolve(d);
            }, 500);
        });
    };

    stringify = function (dataObj) {
        if (typeof dataObj.stringify === 'function') {
            return dataObj.stringify();
        }
        return JSON.stringify(dataObj);
    };

    writeMongoPromise = function (collection, arr) {
        var db, bad;
        if (databaseForMongo) {
            return new Promise(function (resolve, reject) {
                MongoClient.connect('mongodb://localhost:27017/' + databaseForMongo, function (err, db1) {
                    if (!err) {
                        db = db1;
                        //redefine this function
                        writeMongoPromise = function (collection, arr) {
                            if (bad) {
                                reject('Could not connect to database');
                            }
                            var col = db.collection(collection);
                            return col.insertMany(arr.map(function (dataObj) {
                                return JSON.parse(stringify(dataObj));
                            }));
                        };
                        //Call this again
                        writeMongoPromise(collection, arr).then(function () {
                            resolve();
                        }).catch(function (err2) {
                            reject(err2);
                        });

                    } else {
                        reject('Could not connect to database');
                        bad = true;
                    }
                });
            });
        }
        return Promise.reject('No database provided.');
    };

    readFiles = function (backgroundFile, signalFile) {
        /*
            This function is a mess. It take a bunch of input from the user to display
            questions to verify the data look right and it opens files and it pareses
            files and it makes sure that the article numbers are correct.
            It ends by calling the runanalses function.

            Should eventually write this as a promise architecture.
        */
        fs.readFile(backgroundFile, 'utf8', function (err1, background) {
            if (err1) {
                console.log(err1);
                return;
            }
            fs.readFile(signalFile, 'utf8', function (err2, signal) {
                if (err2) {
                    console.log(err2);
                    return;
                }
                console.log("starting parser");
                var combinedArrays = parser.parse({
                    signal: {
                        data: signal,
                        filename: signalFile
                    },
                    background: {
                        data: background,
                        filename: backgroundFile
                    }
                });
                var lvl_1_0_0 = combinedArrays['1.0.0'];
                var name = combinedArrays.name;
                console.log('All parsed.');

                var i, j, found, questions = {properties: {}}, questions2 = {properties: {}}, barcodeSpec, barcodeIndexes = {};
                console.log(colors.red.underline('We are checking the descriptions for the sample meta data. If you just hit enter the original name will be maintained.'));
                for (i = 0; i < name.length; i += 1) {
                    found = false;
                    for (j = 0; j < name[i].sample_data.length; j += 1) {
                        questions.properties[i + "_" + j] = {
                            description: '"' + name[i].sample_data[j].value + '" is saved as "' + name[i].sample_data[j].key + '" for ' + name[i].name + '. Would you like to change this description?',
                            type: 'string',
                            default: name[i].sample_data[j].key
                        };
                    }
                    for (j = 0; !found && j < name[i].run_data.length; j += 1) {
                        if (name[i].run_data[j].key.replace(/\s+/, '_').match(/article_number/i)) {
                            found = true;
                        }
                    }
                    if (!found) {
                        barcodeSpec = name[i].name.replace(/_\d+$/, '');
                        barcodeIndexes[barcodeSpec] = barcodeIndexes[barcodeSpec] || [];
                        barcodeIndexes[barcodeSpec].push(i);
                        questions2.properties[barcodeSpec] = {
                            description: 'Enter article number for: ' + barcodeSpec,
                            type: 'string',
                            required: true,
                            pattern: /^\d+$|^skip$|^ye*s*$/im,
                            message: 'Article numbers must be numerical. See above.'
                        };
                    }
                }

                prompt.start();
                prompt.get({properties: {"0": {description: 'Continue? (Y)', type: "string", required: true, pattern: /Ye*s*/i, message: 'type "y" to continue.'}}}, function () {
                    prompt.get(questions, function (err, results) {
                        var ij;
                        if (err) {
                            console.error(err);
                            return;
                        }
                        var resultKeys = Object.keys(results);
                        for (i = 0; i < resultKeys.length; i += 1) {
                            ij = resultKeys[i].split('_');
                            name[ij[0]].sample_data[ij[1]].key = results[resultKeys[i]];
                            lvl_1_0_0[ij[0]].sample_data[ij[1]].key = results[resultKeys[i]];
                        }
                        console.log(colors.red.underline('The following do not have an "Article Number". This is the design number for the chip used. Due to a bug PTK chips that have the Article Number "86312" often cannot export this number. If this you are using a PTK 86312 type "y". If you want to leave Article number out of the database (not recommended) type "skip"; otherwise type an article number for the chip.'));
                        prompt.get(questions2, function (err, results) {
                            if (err) {
                                console.error(err);
                                return;
                            }
                            resultKeys = Object.keys(results);
                            for (i = 0; i < resultKeys.length; i += 1) {
                                for (j = 0; j < barcodeIndexes[resultKeys[i]].length; j += 1) {
                                    ij = barcodeIndexes[resultKeys[i]][j];
                                    if (results[resultKeys[i]] === 'y') {
                                        results[resultKeys[i]] = "86312";
                                    }
                                    if (results[resultKeys[i]] !== 'skip') {
                                        name[ij].run_data.push({
                                            key: 'Article Number',
                                            value: results[resultKeys[i]]
                                        });
                                        lvl_1_0_0[ij].run_data.push({
                                            key: 'Article Number',
                                            value: results[resultKeys[i]]
                                        });
                                    }
                                }
                            }
                            //continue on to the next stage...
                            fs.readFile(model, 'utf8', function (err3, equation) {
                                if (err3) {
                                    console.error(err3, 'failed to get equation');
                                }
                                runanalyses({
                                    name: name,
                                    equation: parse_equation(equation),
                                    lvl_1_0_0: lvl_1_0_0
                                });
                            });
                        });
                    });
                });
            });
        });
    };

    parse_equation = function (eq) {
        return eq.replace(
            /\/\/[^\n]*/g, //Replace the comment lines with nothing
            ""
        ).replace(/\s+/g, ' '); //get rid of all space characters
    };

    runanalyses = function (data) {
        /*
            This gets a data object, intialized names, lvl_1_0_0, and equation.

            This will fit curves to detect outliers, store the outliers in the lvl
            1.0.1 data, adding on the linear fit information. Finally a shift to 0
            is applied setting the lowest value for an array to 0 across the entire
            array.
            (All done in quality_filtration.js)

            The next step is to smooth the backgrounds
        */

        data.lvl_1_0_0 = add_get(data.lvl_1_0_0);
        var barBuilder = function (msg) {
            return function (counts) {
                var interval, bar, last = 0;
                bar = new ProgressBar('  ' + msg + ' [:bar] :rate fits/s :percent :etas', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: counts.total
                });
                interval = setInterval(function () {
                    if (counts.done === counts.total) {
                        clearInterval(interval);
                    }
                    bar.tick(counts.done - last);
                    last = counts.done;
                }, 0.1); //For some reason I do not understand, the more often
                            //this checks the faster the analyses runs...
            };
        };

        filter({
            data: data.lvl_1_0_0,
            amd_ww: amd_ww,
            equation: data.equation,
            worker: fitCurvesWorker,
            number_threads: 64, //This can be obscenely high on servers
            linearUpdate: barBuilder('fitting linear'),
            kineticUpdate: barBuilder('fitting kinetic')
        }).then(function (d) {
            data.lvl_1_0_1 = d;
        }).then(timeoutPromise).catch(function (err) {
            console.error('fitting failed', err);
        }).then(function () {
            //normalize background
            return normalize({
                amd_ww: amd_ww,
                worker: normalizeWorker,
                data: data.lvl_1_0_1,
                update: barBuilder('smoothing background'),
                number_threads: 64
            });
        }).then(function (d112) {
            data.lvl_1_1_2 = d112;
        }).then(timeoutPromise).catch(function (err) {
            console.error(err);
        }).then(function () {
            //fit curves
            return parameterize({
                data: data.lvl_1_0_1,
                amd_ww: amd_ww,
                equation: data.equation,
                worker: fitCurvesWorker,
                number_threads: 64,
                update: barBuilder('building lvl 2.0.1')
            });
        }).then(timeoutPromise).then(function (res) {
            //fit curves
            data.lvl_2_0_1 = res;
            return parameterize({
                data: data.lvl_1_1_2,
                amd_ww: amd_ww,
                equation: data.equation,
                worker: fitCurvesWorker,
                number_threads: 64,
                update: barBuilder('building lvl 2.1.2')
            });
        }).catch(function (err) {
            console.error('curves failed to fit', err);
        }).then(timeoutPromise).then(function (res) {
            //write all of the files
            data.lvl_2_1_2 = res;
            console.log('writing files');
            var ps = [];
            ps[0] = writeFilePromise(data.name.map(stringify).join('\n'), 'names.mdb');
            ps[1] = writeFilePromise(data.lvl_1_0_0.map(stringify).join('\n'), 'lvl_1_0_0.mdb');
            ps[2] = writeFilePromise(data.lvl_1_0_1.map(stringify).join('\n'), 'lvl_1_0_1.mdb');
            ps[3] = writeFilePromise(data.lvl_1_1_2.map(stringify).join('\n'), 'lvl_1_1_2.mdb');
            ps[4] = writeFilePromise(data.lvl_2_0_1.map(stringify).join('\n'), 'lvl_2_0_1.mdb');
            ps[5] = writeFilePromise(data.lvl_2_1_2.map(stringify).join('\n'), 'lvl_2_1_2.mdb');

            if (databaseForMongo) {
                var psMongo = [];

                psMongo[0] = writeMongoPromise('name', data.name);
                psMongo[1] = writeMongoPromise('lvl_1.0.0', data.lvl_1_0_0);
                psMongo[2] = writeMongoPromise('lvl_1.0.1', data.lvl_1_0_1);
                psMongo[3] = writeMongoPromise('lvl_1.1.2', data.lvl_1_1_2);
                psMongo[4] = writeMongoPromise('lvl_2.0.1', data.lvl_2_0_1);
                psMongo[5] = writeMongoPromise('lvl_2.1.2', data.lvl_2_1_2);

                ps.push(Promise.all(psMongo));
            }

            return Promise.all(ps).catch(function (err) {
                console.error("A file failed to write", err);
            });
        }).then(function () {
            console.log('all done!');
            process.exit(0);
        });

        return;
    };

    return colors;
}());


//actually start the program
if (myArgs.h || myArgs.help || !myArgs.b || !myArgs.s) {
    console.log(
        'This requires a number of parameters to run. ' +
        'Input files: background and signal files using -b and -s flags respectively. ' +
        'Database parameters: Specify database name using -d. ' +
        'Finally you may give an output directory and base with -o. ' +
        'Output files will tag on <level>.mdb.'
    );
} else {
    readFiles(myArgs.b, myArgs.s);
    if (myArgs.o) {
        fout = myArgs.o;
    }
    if (myArgs.d) {
        databaseForMongo = myArgs.d;
    }
}

// var backgroundFile = '../data_examples/_Export_Median_Background_170608121944.txt';
// var signalFile = '../data_examples/_Export_Median_Signal_170608121940.txt';


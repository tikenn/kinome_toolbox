/*jslint bitwise: true*/
/*global KINOME*/
//Big TO-DO: need to make sure to check for all needed things and throw a flag if
// there is some sort of error...
(function (exports) {
    'use strict';

    var main, split_t, parseCrossTab, objectifyMeta, objectifyData, getIndex,
            foldMeta, checkSame, mult1, mergeObjects, copy, uuid, organizeMeta,
            checkNaN, clean;

    getIndex = function (ind) {
        //maps through grabbing index
        return function (x) {
            return [copy(x[ind])];
        };
    };

    clean = function (str) {
        if (typeof str === 'string') {
            return str.replace(/^[\s"']+|[\s"']+$/g, ''); //gets rid of leading and ending quotes and blanks
        } else {
            return str;
        }
    };

    var cleaner = function (a, b) {
        var out = [];
        if (Array.isArray(a)) {
            out = out.concat(a);
        } else if (typeof a !== 'string' || !a.match(/^\s*$/)) {
            out.push(a);
        }
        if (Array.isArray(b)) {
            out = out.concat(a);
        } else if (typeof b !== 'string' || !b.match(/^\s*$/)) {
            out.push(b);
        }
        return out;
    };

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

    checkSame = function (a, b) {
        //reduce function
        return (a === b || (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)))
            ? a
            : null;
    };

    checkNaN = function (x) {
        //map function
        if (typeof x === 'string' && x.match(/^NA$|^NAN$/im)) {
            return NaN;
        }
        return x;
    };

    copy = function (x) {
        //lower case and remove spaces for cleaner objects
        if (typeof x === 'object') {
            return JSON.parse(JSON.stringify(x));
        }
        return x;
    };

    foldMeta = function (array) {
        var sameB;
        array = array.map(checkNaN);
        sameB = array.reduce(checkSame);
        if (sameB !== null) {
            return sameB;
        }
        return array;
    };

    split_t = function (str) {
        //for map
        return str.split('\t');
    };

    parseCrossTab = function (crossTabArr, filename) {
        var runMetaData, indMetaData, data_and_peptides, metaArr, result, resultObj,
                i, sample, peptideHeaderLine, peptideArr, dataArr, barcode_index,
                row_index, name, j, names, check, thisId;

        //join with ';' ignores blank strings
        runMetaData = crossTabArr.shift().join(';').replace(/^[\s;]+|[\s;]+$/g, '');
        indMetaData = [];
        result = [];
        resultObj = {};

        do {
            indMetaData.push(crossTabArr.shift());
        } while (!crossTabArr[0][0]);

        //Get rid of header line
        peptideHeaderLine = crossTabArr.shift();

        //Get data and meta objects
        data_and_peptides = objectifyData(crossTabArr, peptideHeaderLine);
        dataArr = data_and_peptides.data; // P arrays with N data points
        peptideArr = data_and_peptides.peptides; // P arrays with key value pairs
        metaArr = objectifyMeta(indMetaData); // N arrays with key value pairs

        //find places with needed meta data
        for (i = 0; i < metaArr[0].length; i += 1) {
            if (metaArr[0][i].key.match(/^barcode$/i)) {
                barcode_index = i;
            }
            if (metaArr[0][i].key.match(/^row$/i)) {
                row_index = i;
            }
        }

        //build this up
        for (i = 0; i < metaArr.length; i += 1) { //by image
            name = metaArr[i][barcode_index].value[0] + '_' + metaArr[i][row_index].value[0];
            thisId = uuid();
            if (!resultObj.hasOwnProperty(name)) {
                resultObj[name] = {
                    peptides: copy(peptideArr),
                    name: name,
                    name_id: thisId,
                    '_id': thisId,
                    meta: metaArr[i],
                    data: dataArr.map(getIndex(i))
                };
            } else {
                for (j = 0; j < metaArr[i].length; j += 1) {// by meta annotation
                    resultObj[name].meta[j].value =
                            resultObj[name].meta[j].value.concat(copy(metaArr[i][j].value));
                }
                for (j = 0; j < dataArr.length; j += 1) {//by peptide
                    resultObj[name].data[j].push(copy(dataArr[j][i]));
                }
            }
        }
        names = Object.keys(resultObj);


        //Perform simplification methods
        for (i = 0; i < names.length; i += 1) {
            sample = resultObj[names[i]];
            for (j = 0; j < sample.meta.length; j += 1) {
                // if (j === 6 && i === 0) {
                //     console.log(JSON.stringify(sample.meta[j]));
                // }
                if (!sample.meta[j].key.match(/^(exposure\stime|cycle)$/i)) {
                    sample.meta[j].value = foldMeta(sample.meta[j].value);
                }
                if (sample.meta[j].value === null || (typeof sample.meta[j].value === 'number' && Number.isNaN(sample.meta[j].value))) {
                    //If there is no data, do not bother storing it
                    // console.log('getting rid of: ', sample.meta.splice(j, 1));
                    sample.meta.splice(j, 1);
                    j -= 1;
                }
            }
            //add in previously determined meta data
            sample.meta.push({
                key: 'filename',
                value: clean(filename)
            });
            sample.meta.push({
                key: 'title line',
                value: clean(runMetaData)
            });

            //find places with needed meta data
            for (j = 0; j < sample.meta.length; j += 1) {
                if (sample.meta[j].key.match(/^cycle$/i)) {
                    sample.cycles = copy(sample.meta[j].value.map(mult1));
                }
                if (sample.meta[j].key.match(/^exposure[\s_]*time$/i)) {
                    sample.exposures = copy(sample.meta[j].value.map(mult1));
                }
            }

            for (j = 0; j < sample.data.length; j += 1) { //by peptide
                check = sample.data[j].reduce(checkSame);
                if (Number.isNaN(check)) { // remove peptides for which there are no values
                    sample.data.splice(j, 1);
                    sample.peptides.splice(j, 1);
                    j -= 1;
                }
            }
            result.push(sample);
        }

        return result;
    };

    objectifyMeta = function (meta) {
        var arrOut, arrMin, i, j, keys;

        arrOut = [];
        keys = [];

        for (i = 0; i < meta.length; i += 1) {
            while (!meta[i][0]) {
                meta[i].shift();
            }
            keys.push(meta[i].shift());
        }
        for (i = 0; i < meta[0].length; i += 1) {
            arrMin = [];
            for (j = 0; j < keys.length; j += 1) {
                arrMin.push({
                    key: clean(keys[j]),
                    value: clean([meta[j][i]])
                });
            }
            arrOut.push(arrMin);
        }

        return arrOut;
    };

    objectifyData = function (data, headerLine) {
        var i, j, obj, pepObj;

        obj = {
            peptides: [],
            data: []
        };

        for (i = 0; i < data.length; i += 1) {
            pepObj = [];
            j = 0;
            while (data[i][0] && data[i].length) {
                pepObj.push({
                    key: clean(headerLine[j]),
                    value: clean(data[i].shift())
                });
                j += 1;
            }
            obj.peptides.push(pepObj);

            //Now clear white space
            while (!data[i][0] && data[i].length) {
                data[i].shift();
            }

            obj.data.push(data[i].map(mult1));
        }
        return obj;
    };

    main = function (parseObject) {
        var signalArr, signalObj, backgroundArr, backgroundObj,
                combinedObj, name;
            // \r is to deal with windows endline coding

        //split
        signalArr = parseObject.signal.data.split(/[\r\n]+/).reduce(cleaner).map(split_t);
        backgroundArr = parseObject.background.data.split(/[\r\n]+/).reduce(cleaner).map(split_t);

        //parse
        signalObj = parseCrossTab(signalArr, parseObject.signal.filename);
        backgroundObj = parseCrossTab(backgroundArr, parseObject.background.filename);

        combinedObj = mergeObjects(signalObj, backgroundObj);

        if (!combinedObj) {
            throw "failed to combine files, make sure all meta data is included"
                    + " and the files were exported at the same time with"
                    + " seperate data.";
        }

        //finally we make a copy of this object and export it as both lvl 1.0.0
        // and names
        name = copy(combinedObj);
        name.map(function (x) {
            x.level = 'name';
            delete x.signal;
            delete x.background;
            delete x.signal_valid;
            delete x.background_valid;
            return x;
        });

        //add combined level
        combinedObj.map(function (x) {
            x.level = '1.0.0';
            return x;
        });

        return {
            name: name,
            '1.0.0': combinedObj
        };
    };

    mergeObjects = function (signal_arr, background_arr) {
        /*
            At this point we have two arrays. They are made of objects with the
            following properties:

            //These can be handled independently
            meta: [{key: _, val: _}, ...m]
            name: barcode_row
            name_id: uuid

            //These must be aligned
            cycles: [int, int, ... Images]
            exposures: [int, int, ..., Images]
            peptides: [[{key: _, val: _}, ... mp], ... Peps]
            data: [0...Peps][0..Images] -> number

            We need to return the same, but with data as background and signal,
            making sure that the peptides, cycles and exposures all line up.
            Merge the meta data when appropriate and keep both sets when it is
            not. Also need to select one uuid

        */
        var merge, result_arr = [], mergeKeyValues, object_same;


        object_same = function (obj1, obj2) {
            var same = true, pair, pairs = [[obj1, obj2]], keys0, keys1, i;
            while (same && pairs.length) {
                pair = pairs.shift();
                if (typeof pair[0] !== typeof pair[1]) {
                    same = false;
                }
                if (typeof pair[0] !== 'object') {
                    if (pair[0] !== pair[1]) {
                        same = false;
                    }
                } else {
                    keys0 = Object.keys(pair[0]).sort();
                    keys1 = Object.keys(pair[1]).sort();
                    if (keys0.length !== keys1.length) {
                        same = false;
                    } else {
                        for (i = 0; i < keys0.length; i += 1) {
                            if (keys0[i] === keys1[i]) {
                                pairs.push([pair[0][keys0[i]], pair[1][keys1[i]]]);
                            } else {
                                same = false;
                            }
                        }
                    }
                }
            }
            return same;
        };

        merge = function (signal, background) {
            var result = {}, i, j, paired = true, pairs = [], bykey, pep_ind,
                    max_cycle, img_ind, ID = '_id';

            //the easy stuff
            result.meta = mergeKeyValues(signal.meta, background.meta);
            result.name = signal.name;
            result.name_id = signal.name_id;
            result[ID] = signal.name_id;
            result = organizeMeta(result);

            result.exposures = [];
            result.cycles = [];
            result.peptides = [];
            result.signal = [];
            result.background = [];
            result.signal_valid = [];
            result.background_valid = [];

            bykey = function (a, b) {
                //sort function
                var keyA = a.key.toUpperCase();
                var keyB = b.key.toUpperCase();
                if (keyA < keyB) {
                    return -1;
                }
                if (keyA > keyB) {
                    return 1;
                }
                return 0;
            };

            //now the more complicated stuff, make sure all the lengths are
            // equal remember cycles length = exposure length = data[i] length
            // and data length = peptide length
            if (
                signal.exposures.length !== background.exposures.length ||
                signal.cycles.length !== background.cycles.length ||
                signal.exposures.length !== background.cycles.length ||
                signal.peptides.length !== background.peptides.length ||
                signal.data.length !== background.data.length ||
                signal.data.length !== background.peptides.length ||
                signal.data[0].length !== background.data[0].length ||
                signal.data[0].length !== background.cycles.length
            ) {
                paired = false;
            }
            //align by image
            for (i = 0; paired && i < signal.exposures.length; i += 1) {
                paired = false;
                for (j = 0; !paired && j < background.exposures.length; j += 1) {
                    if (
                        signal.exposures[i] === background.exposures[j] &&
                        signal.cycles[i] === background.cycles[j]
                    ) {
                        //image pair found
                        paired = true;
                        result.exposures.push(signal.exposures[i]);
                        result.cycles.push(signal.cycles[i]);
                        pairs.push({fore: i, back: j});
                    }
                }
            }

            //finally align by peptide
            for (i = 0; paired && i < signal.peptides.length; i += 1) {
                paired = false;
                for (j = 0; !paired && j < background.peptides.length; j += 1) {
                    if (object_same(
                        signal.peptides[i].sort(bykey),
                        background.peptides[j].sort(bykey)
                    )) {
                        //found a peptide pair, now push in all the data
                        paired = true;
                        result.peptides.push(signal.peptides[i]);
                        pep_ind = result.peptides.length - 1;
                        for (img_ind = 0; img_ind < pairs.length; img_ind += 1) {
                            //fill in all the data stuff, initialize arrays
                            result.signal[img_ind] = result.signal[img_ind] || [];
                            result.background[img_ind] = result.background[img_ind] || [];
                            result.signal_valid[img_ind] = result.signal_valid[img_ind] || [];
                            result.background_valid[img_ind] = result.background_valid[img_ind] || [];

                            //add in actual data
                            result.signal[img_ind][pep_ind] = signal.data[i][pairs[img_ind].fore];
                            result.background[img_ind][pep_ind] = background.data[j][pairs[img_ind].back];

                            //add in capped values
                            result.signal_valid[img_ind][pep_ind] = 0;
                            result.background_valid[img_ind][pep_ind] = 0;
                            if (result.signal[img_ind][pep_ind] < 4095) {
                                result.signal_valid[img_ind][pep_ind] = 1;
                            }
                            if (result.background[img_ind][pep_ind] < 4095) {
                                result.background_valid[img_ind][pep_ind] = 1;
                            }
                        }
                    }
                }
            }

            //now remove the cycle number from the highest value
            // we assume this is post wash
            max_cycle = Math.max.apply(null, result.cycles);
            result.cycles = result.cycles.map(function (x) {
                return x === max_cycle
                    ? null
                    : x;
            });

            if (!paired) {
                result = false;
            }

            //finally sort data by the peptide position, row, column
            var order = result.peptides.map(function (x, i) {
                return [x, i];
            }).sort(function (a, b) {
                var row1, row2, col1, col2;
                a[0].map(function (x) {
                    if (x.key.match(/spot[_\s]*row/i)) {
                        row1 = x.value;
                    }
                    if (x.key.match(/spot[_\s]*col/i)) {
                        col1 = x.value;
                    }
                });
                b[0].map(function (x) {
                    if (x.key.match(/spot[_\s]*row/i)) {
                        row2 = x.value;
                    }
                    if (x.key.match(/spot[_\s]*col/i)) {
                        col2 = x.value;
                    }
                });

                return row1 === row2
                    ? col1 - col2
                    : row1 - row2;
            });

            var result2 = copy(result);
            for (j = 0; j < order.length; j += 1) { // by peptide
                for (img_ind = 0; img_ind < result.signal.length; img_ind += 1) {
                    // by image
                    result2.signal[img_ind][j] = result.signal[img_ind][order[j][1]];
                    result2.background[img_ind][j] = result.background[img_ind][order[j][1]];
                    result2.signal_valid[img_ind][j] = result.signal_valid[img_ind][order[j][1]];
                    result2.background_valid[img_ind][j] = result.background_valid[img_ind][order[j][1]];
                }
                result2.peptides[j] = result.peptides[order[j][1]];
            }

            return result2;
        };

        mergeKeyValues = function (signal, background) {
            //This will be used for both individual peptides and meta objects
            var i, j, result = [], paired, pairedBack = [];

            //look for pairs
            for (i = 0; i < signal.length; i += 1) {
                paired = false;
                for (j = 0; !paired && j < background.length; j += 1) {
                    if (signal[i].key === background[j].key) {
                        paired = true;
                        pairedBack[j] = true;
                        //found a pair, save it if it is the same value for both
                        if (object_same(signal[i], background[j])) {
                            result.push(signal[i]);
                        //otherwise add the origin parameter and save them both
                        } else {
                            signal[i].origin = 'signal';
                            background[j].origin = 'background';
                            result.push(signal[i]);
                            result.push(background[j]);
                        }
                    }
                }
                //If no pairing is found then push it solo
                if (!paired) {
                    signal[i].origin = 'signal';
                    result.push(signal[i]);
                }
            }
            //finally if any backgrounds did not pair
            for (i = 0; i < background.length; i += 1) {
                if (!pairedBack[i]) {
                    background[i].origin = 'signal';
                    result.push(background[i]);
                }
            }
            return result;
        };

        //Find name pairs then get things rolling
        var i, j, merged_pair, paired = true;
        for (i = 0; paired && i < signal_arr.length; i += 1) {
            paired = false;
            for (j = 0; !paired && j < background_arr.length; j += 1) {
                if (signal_arr[i].name === background_arr[j].name) {
                    merged_pair = merge(
                        signal_arr[i],
                        background_arr[j]
                    );
                    if (merged_pair) {
                        paired = true;
                        result_arr.push(merged_pair);
                    }
                }
            }
        }
        if (!paired) {
            result_arr = false;
        }
        return result_arr;
    };

    mult1 = function (val) {
        //essentially to convert all values in an array to number
        return val * 1;
    };

    organizeMeta = function (object) {
        var runDataKeys, i, j, runData = [], sampleData = [], paired;
        runDataKeys = [
            "barcode", "row", "col", "filter", "image", "temperature",
            "instrument_type", "instrument_unit", "image_timestamp",
            "lamp_power", "lamp_refrence_power", "pamchip_location", "array",
            "runData", "gridid", "grid_type", 'article_number', 'exposure_time',
            'cycle', 'title_line', 'filename', 'cubeid'
        ];
        runDataKeys = runDataKeys.map(function (x) {
            return new RegExp('^' + x + '$', 'i');
        });

        for (i = 0; i < object.meta.length; i += 1) {
            paired = false;
            for (j = 0; !paired && j < runDataKeys.length; j += 1) {
                if (object.meta[i].key.replace(/\s+/g, '_').match(runDataKeys[j])) {
                    runData.push(copy(object.meta[i]));
                    paired = true;
                }
            }
            if (!paired) {
                sampleData.push(copy(object.meta[i]));
            }
        }

        delete object.meta;
        object.sample_data = sampleData;
        object.run_data = runData;

        return object;
    };

    exports.parse = main;

}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
/*global KINOME*/
(function (exports) {
    'use strict';

    exports.enrich = function (object) {
        /*
        The idea here is to take an object or an array and outfit it with get
        and list functions. This is to make it easier to grab the data of
        interest. It just needs to know the level of the data. Only works for
        level 1 for now...
        */
        var get, copy, list, clone, define_lists, cycle_list, cycle_object,
                exposure_list, mult1, peptide_list, peptide_object, exposure_object,
                set_function, more_function, verify_get_input, append, blank_array,
                check_apppend_params, stringify;
        get = function (getParams) {
            var i, j, k, peps, cycs, exps, retArr = [], img_ind, pep_ind;
            /*
                Get params can have a peptide string or array
                                    a cycle number or array
                                    an exposure number or array
            */
            var that = this;

            getParams = verify_get_input(getParams);
            peps = getParams.peptides;
            exps = getParams.exposures;
            cycs = getParams.cycles;

            //now get all possible combinations
            for (i = 0; i < peps.length; i += 1) {
                for (j = 0; j < cycs.length; j += 1) {
                    for (k = 0; k < exps.length; k += 1) {
                        img_ind = cycle_object[cycs[j]][exps[k]];
                        pep_ind = peptide_object[peps[i]].index;

                        if (img_ind !== undefined && pep_ind !== undefined) {
                            retArr.push({
                                peptide: peps[i],
                                cycle: cycs[j],
                                exposure: exps[k],
                                signal: that.signal[img_ind][pep_ind],
                                signal_valid: that.signal_valid[img_ind][pep_ind],
                                background: that.background[img_ind][pep_ind],
                                background_valid: that.background_valid[img_ind][pep_ind],
                                spot_row: peptide_object[peps[i]].row,
                                spot_column: peptide_object[peps[i]].col,
                                set: set_function(img_ind, pep_ind, that),
                                more: more_function(img_ind, peptide_object[peps[i]])
                            });
                        }
                    }
                }
            }

            return retArr;
        };

        append = function (appendParams) {
            /*
                This needs get get all the parameters passed in. They are:
                    //To add
                    value: number
                    valid: number (0/1) or true / false
                    //To find it
                    type: /signal|background/
                    peptide: string
                    cycle: null or number [Note: null === post wash]
                    exposure: null or number [Note: null === cycle slope]
                This then adds the data to the data array, then the appropriate
                slopes, cycle number, and meta data stuff
            */
            var that = this, val, bool, type, pep, exp, cyc, i, get_result;
            if (check_apppend_params(appendParams)) {
                val = appendParams.value;
                bool = appendParams.valid;
                type = appendParams.type;
                pep = appendParams.peptide;
                cyc = appendParams.cycle;
                exp = appendParams.exposure;

                exp = exp === null
                    ? "Cycle Slope"
                    : exp;
                cyc = cyc === null
                    ? "Post Wash"
                    : cyc;

                //Get started with easy option, already added this combo
                get_result = that.get({peptide: pep, cycle: cyc, exposure: exp});
                if (get_result.length !== 1) {
                    //This point does not exist yet, we have to add stuff everywhere.
                    // Start with the data, this all has to grow at the same time.
                    that.signal.push(blank_array(that[type][0].length));
                    that.signal_valid.push(blank_array(that[type][0].length));
                    that.background.push(blank_array(that[type][0].length));
                    that.background_valid.push(blank_array(that[type][0].length));

                    //Now cycle and exposure
                    that.cycles.push(typeof cyc === 'string'
                        ? null
                        : cyc);
                    that.exposures.push(typeof exp === 'string'
                        ? null
                        : exp);

                    //Now the meta data
                    for (i = 0; i < that.run_data.length; i += 1) {
                        if (Array.isArray(that.run_data.value) &&
                                that.run_data.value.length === that.cycles.length - 1) {
                            that.run_data.value.push(undefined);
                        }
                    }
                    //Now update the lists and redefine get result and continue on
                    define_lists(that);

                    get_result = that.get({peptide: pep, cycle: cyc, exposure: exp});
                }

                if (get_result.length === 0) {
                    console.log({peptide: pep, cycle: cyc, exposure: exp});
                }

                //Either this point existed, or it now does, so set it.
                get_result[0].set(type, val);
                get_result[0].set(type + '_valid', bool);
                return true;
            }
            console.error('Failed to set, one or more parameters were missing or invalid.');
            return false;
        };

        check_apppend_params = function (params) {
            /*
                This needs get check for
                    value: number
                    valid: number (0/1) or true / false
                    type: /signal|background/ (string)
                    peptide: string
                    cycle: null or number [Note: null === post wash]
                    exposure: null or number [Note: null === cycle slope]
            */
            // console.log(params);
            var res = false;
            if (params) {
                // console.log('made it here 1');
                if ( //check for existance
                    params.hasOwnProperty("value") && params.hasOwnProperty("valid")
                    && params.hasOwnProperty("type") && params.hasOwnProperty("peptide")
                    && params.hasOwnProperty("cycle") && params.hasOwnProperty("exposure")
                ) {
                    // console.log('made it here 2');
                    //coerce types a bit
                    params.value *= 1;
                    params.valid *= 1;
                    params.cycle = params.cycle === null
                        ? null
                        : params.cycle === "Post Wash"
                            ? null
                            : params.cycle * 1;
                    params.exposure = params.exposure === null
                        ? null
                        : params.exposure === "Cycle Slope"
                            ? null
                            : params.exposure * 1;
                    if ( //now check types
                        !isNaN(params.value) && !isNaN(params.valid) &&
                        !isNaN(params.cycle) && !isNaN(params.exposure) &&
                        typeof params.type === 'string' && typeof params.peptide === 'string'
                    ) {
                        // console.log('made it here 3');
                        //finally check for a valid value
                        if (peptide_object.hasOwnProperty(params.peptide) && params.type.match(/background|signal/)) {
                            res = true;
                            // console.log('made it here 4');
                        }
                    }
                }
            }
            return res;
        };

        verify_get_input = function (getParams) {
            var peps, cycs, exps, i;
            //make sure they are here at all
            getParams = getParams || {};

            //peptide check
            peps = getParams.hasOwnProperty("peptides")
                ? getParams.peptides
                : getParams.hasOwnProperty("peptide")
                    ? getParams.peptide
                    : peptide_list;

            //cycles check
            cycs = getParams.hasOwnProperty("cycles")
                ? getParams.cycles
                : getParams.hasOwnProperty("cycle")
                    ? getParams.cycle
                    : undefined;

            //exposures check
            exps = getParams.hasOwnProperty("exposures")
                ? getParams.exposures
                : getParams.hasOwnProperty("exposure")
                    ? getParams.exposure
                    : undefined;


            //Do not get post wash by default. That needs to be specifically
                // requested. Set up cycs here, only if nothing was passed in
            if (cycs === undefined) {
                cycs = copy(cycle_list);
                for (i = 0; i < cycs.length; i += 1) {
                    if (cycs[i] === 'Post Wash') {
                        cycs.splice(i, 1);
                        i -= 1; //Should only be one, but this doesn't cost much
                    }
                }
            }

            //Do not get cycle slope by default. That needs to be specifically
                // requested. Only call this if nothing was passed in
            if (exps === undefined) {
                exps = copy(exposure_list);
                for (i = 0; i < exps.length; i += 1) {
                    if (exps[i] === 'Cycle Slope') {
                        exps.splice(i, 1);
                        i -= 1; //Should only be one, but this doesn't cost much
                    }
                }
            }

            //make sure they are arrays
            peps = Array.isArray(peps)
                ? peps
                : [peps];
            cycs = Array.isArray(cycs)
                ? cycs
                : [cycs];
            exps = Array.isArray(exps)
                ? exps
                : [exps];

            //finally make sure all of these values are valid, if not, then
                // remove them from the final arrays.
            for (i = 0; i < peps.length; i += 1) {
                if (!peptide_object.hasOwnProperty(peps[i])) {
                    peps.splice(i, 1);
                }
            }
            for (i = 0; i < cycs.length; i += 1) {
                if (!cycle_object.hasOwnProperty(cycs[i])) {
                    cycs.splice(i, 1);
                }
            }
            for (i = 0; i < exps.length; i += 1) {
                if (!exposure_object.hasOwnProperty(exps[i])) {
                    exps.splice(i, 1);
                }
            }

            return {
                cycles: cycs,
                exposures: exps,
                peptides: peps
            };
        };

        set_function = function (img_ind, pep_ind, data) {
            return function (key, value) {
                var that = this;
                if (key.match(/^(signal|background)(_valid)*$/)) {
                    data[key][img_ind][pep_ind] = value;
                    that[key] = value;
                }
            };
        };

        more_function = function (img_ind, pep_info) {
            return function () {
                return {
                    peptide: copy(pep_info),
                    image_index: img_ind
                };
            };
        };

        list = function (list_term) {
            //just return copies of the list objects
            list_term = list_term || "";
            if (list_term.match(/peptide/i)) {
                return copy(peptide_list);
            }
            if (list_term.match(/exposure/i)) {
                return copy(exposure_list);
            }
            if (list_term.match(/cycle/i)) {
                return copy(cycle_list);
            }
            return {
                peptides: copy(peptide_list),
                exposures: copy(exposure_list),
                cycles: copy(cycle_list)
            };
        };

        define_lists = function (object) {
            var i, j, key, indFor_ID, indFor_Row, indFor_Col, cyc, exp;

            //intialize
            cycle_list = [];
            cycle_object = {};
            exposure_list = [];
            exposure_object = {};
            peptide_list = [];
            peptide_object = {};

            //get peptide list
            for (i = 0; i < object.peptides.length; i += 1) {//by peptide
                for (j = 0; j < object.peptides[i].length; j += 1) {//by key val pair
                    if (object.peptides[i][j].key === "ID") {
                        indFor_ID = j;
                    }
                    if (object.peptides[i][j].key === "spotRow") {
                        indFor_Row = j;
                    }
                    if (object.peptides[i][j].key === "spotCol") {
                        indFor_Col = j;
                    }
                }
                key = object.peptides[i][indFor_ID].value;
                if (key !== '#REF') {
                    while (peptide_object.hasOwnProperty(key)) {
                        key += '_2';
                    }
                    peptide_list.push(key);
                    peptide_object[key] = {
                        name: object.peptides[i][indFor_ID].value,
                        row: object.peptides[i][indFor_Row].value,
                        col: object.peptides[i][indFor_Col].value,
                        index: i,
                        full: object.peptides[i]
                    };
                }
            }

            //get cycles and exposures list
            for (i = 0; i < object.cycles.length; i += 1) {
                cyc = object.cycles[i];
                if (cyc === null) {
                    cyc = "Post Wash";
                }
                exp = object.exposures[i];
                if (exp === null) {
                    exp = "Cycle Slope";
                }
                cycle_object[cyc] = cycle_object[cyc] || [];
                cycle_object[cyc][exp] = i;
                exposure_object[exp] = 1;

            }
            cycle_list = Object.keys(cycle_object).map(mult1);
            exposure_list = Object.keys(exposure_object).map(mult1);
        };

        blank_array = function (length) {
            var i, res = [];
            for (i = 0; i < length; i += 1) {
                res.push(undefined);
            }
            return res;
        };

        copy = function (x) {
            //Just copies
            return JSON.parse(JSON.stringify(x));
        };

        clone = function () {
            //Uses simple p/s to return a getted version of the object
            return exports.enrich(copy(this));
        };

        mult1 = function (x) {
            //for map
            if (x.match(/Post\ Wash|Cycle\ Slope/i)) {
                return x;
            }
            return x * 1;
        };

        stringify = function () {
            var that = this;
            //idea here is just to round numbers to 6 decimal point then call
            // JSON.stringify.

            var keys, objs = [that], one, i;

            while (objs.length > 0) {
                one = objs.shift();
                keys = Object.keys(one);
                for (i = 0; i < keys.length; i += 1) {
                    if (typeof one[keys[i]] === 'object' && one[keys[i]] !== null) {
                        objs.push(one[keys[i]]);
                    } else if (one[keys[i]] && typeof one[keys[i]] === 'number') {
                        //round it, note if it is an integer or has less than 6
                        // digits it will go back to where it was. Also, toPrecision
                        // is a significant figure finder, not a decimal finder
                        // meaning this will drop all but 6 digits to represent a
                        // number
                        one[keys[i]] = one[keys[i]].toPrecision(6) * 1;
                    }
                }
            }
            return JSON.stringify(that);
        };

        //now actually assign the function
        if (Array.isArray(object)) {
            object = object.map(function (x) {
                return exports.enrich(x); //recursively call this function
            });
        } else if (!object.hasOwnProperty('get') && !object.level.match(/name/)) {
            define_lists(object);
            Object.defineProperty(object, 'get', {value: get, enumerable: false});
            Object.defineProperty(object, 'list', {value: list, enumerable: false});
            Object.defineProperty(object, 'clone', {value: clone, enumerable: false});
            Object.defineProperty(object, 'append', {value: append, enumerable: false});
            Object.defineProperty(object, 'stringify', {value: stringify, enumerable: false});
        }
        return object;
    };
    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
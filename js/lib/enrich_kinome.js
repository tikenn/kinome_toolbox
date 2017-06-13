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
            /*defined by level*/
        var get, list, define_lists, append, level_up,
            /*generalizable*/
                clone, stringify,
            /*Super objects*/
                cycle_list, cycle_object,
                peptide_list, peptide_object,
                exposure_list, exposure_object,
            /*glob helpers*/
                level_1_helpers, level_2_helpers, copy, mult1, blank_array,
                ret_full_pep_list, define_peptide_list, verify_get_input;

        //Based on the type we will define a series of functions
        level_1_helpers = function () {
            var set_function, more_function,
                    check_apppend_params;
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

            more_function = function (img_ind, pep_info) {
                return function () {
                    return {
                        peptide: copy(pep_info),
                        image_index: img_ind
                    };
                };
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
                            if (Array.isArray(that.run_data[i].value) &&
                                    that.run_data[i].value.length === that.cycles.length - 1) {
                                that.run_data[i].value.push(undefined);
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

            set_function = function (img_ind, pep_ind, data) {
                return function (key, value) {
                    var that = this;
                    if (key.match(/^(signal|background)(_valid)*$/)) {
                        data[key][img_ind][pep_ind] = value;
                        that[key] = value;
                    }
                };
            };

            list = function (list_term) {
                var ret;
                //just return copies of the list objects
                list_term = list_term || "";
                if (list_term.match(/peptide/i)) {
                    ret = copy(peptide_list);
                    ret.more = ret_full_pep_list;
                    return ret;
                }
                if (list_term.match(/exposure/i)) {
                    return copy(exposure_list);
                }
                if (list_term.match(/cycle/i)) {
                    return copy(cycle_list);
                }
                ret = {
                    peptides: copy(peptide_list),
                    exposures: copy(exposure_list),
                    cycles: copy(cycle_list)
                };
                ret.peptides.more = ret_full_pep_list;
                return ret;
            };

            define_lists = function (object) {
                var i, cyc, exp;

                //intialize
                cycle_list = [];
                cycle_object = {};
                exposure_list = [];
                exposure_object = {};
                peptide_list = [];
                peptide_object = {};

                //get peptide list
                define_peptide_list(object);

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

            level_up = function () {
                /*
                    This is designed for level 1 data, and will only be added on to it.
                    Essentially it clones the level one data, dropping the extra
                    functions, then deletes a bunch of no longer valid things.
                    Finally it returns a level 2 object with its appopriate
                    functions.
                */
                var that = this, i, start, point_count;
                start = JSON.parse(that.stringify());
                point_count = start.cycles.length;
                //Now delete data
                delete start.cycles;
                delete start.exposures;
                delete start.background;
                delete start.background_valid;
                delete start.signal;
                delete start.signal_valid;

                start.linear = {
                    signal: [],
                    background: [],
                    cycles: []
                };
                start.kinetic = {
                    signal: [],
                    background: [],
                    exposures: []
                };

                start.level = start.level.replace(/^1/, "2");

                //get original length of cycle array
                console.log('delete this part once updated the data struct');
                for (i = 0; i < start.run_data.length; i += 1) {
                    if (start.run_data[i].key.match(/^cycle$/i)) {
                        point_count = start.run_data[i].value.length;
                        break;
                    }
                }

                //get rid of run data that no longer makes sense in context
                for (i = 0; i < start.run_data.length; i += 1) {
                    if (start.run_data[i].value.length === point_count) {
                        start.run_data.splice(i, 1);
                        i -= 1;
                    }
                }
                //get rid of sample data that no longer makes sense in context
                for (i = 0; i < start.sample_data.length; i += 1) {
                    if (start.sample_data[i].value.length === point_count) {
                        start.sample_data.splice(i, 1);
                        i -= 1;
                    }
                }

                return exports.enrich(start);
            };
        };

        level_2_helpers = function () {
            var set_function, check_apppend_params, more_function,
                    type_list = ['kinetic', 'linear'];
            append = function (appendParams) {
                /*
                    This needs get get all the parameters passed in. They are:
                        //To add
                        value: number
                        //To find it
                        type: /signal_(linear|kinetic)|background_(linear|kinetic)/
                        peptide: string
                        if linear :
                            cycle: null or number [Note: null === post wash]
                        if kinetic:
                            exposure: null or number [Note: null === cycle slope]
                    This then adds the data to the data array, then the appropriate
                    slopes, cycle number, and meta data stuff
                */
                var that = this, val, pep, exp, cyc, get_result;
                if (check_apppend_params(appendParams)) {
                    val = appendParams.value;
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
                    get_result = that.get({peptide: pep, type: appendParams.fit, cycle: cyc, exposure: exp});
                    if (get_result.length !== 1) {
                        //This point does not exist yet, we have to add stuff everywhere.
                        // Start with the data, this all has to grow at the same time.
                        if (appendParams.fit === 'kinetic') {
                            that.kinetic.signal.push(blank_array(that.peptides.length));
                            that.kinetic.background.push(blank_array(that.peptides.length));
                            that.kinetic.exposures.push(typeof exp === 'string'
                                ? null
                                : exp);
                        } else if (appendParams.fit === 'linear') {
                            that.linear.signal.push(blank_array(that.peptides.length));
                            that.linear.background.push(blank_array(that.peptides.length));
                            that.linear.cycles.push(typeof cyc === 'string'
                                ? null
                                : cyc);
                        }

                        //Now update the lists and redefine get result and continue on
                        define_lists(that);

                        get_result = that.get({peptide: pep, type: appendParams.fit, cycle: cyc, exposure: exp});
                    }

                    if (get_result.length === 0) {
                        console.log({type: appendParams.sig_type, peptide: pep, cycle: cyc, exposure: exp});
                    }

                    //Either this point existed, or it now does, so set it.
                    get_result[0].set(appendParams.sig_type, val);
                    return true;
                }
                console.error('Failed to set, one or more parameters were missing or invalid.');
                return false;
            };

            set_function = function (type, fit_ind, pep_ind, data) {
                return function (key, value) {
                    key = key.toLowerCase();
                    if (key.match(/^signal$|^background$/)) {
                        data[type][key][fit_ind][pep_ind] = value;
                    } else {
                        console.error("failed to set, key invalid");
                    }
                };
            };

            more_function = function (fit_ind, pep_info) {
                return function () {
                    return {
                        peptide: copy(pep_info),
                        fit_index: fit_ind
                    };
                };
            };

            get = function (get_params) {
                /*
                    get can have a peptide, a cycle/exposure, a type
                */
                var that = this, peps, cycs, exps, types, i, j, k, dim2,
                        dim2_key, dim2Obj, other_key, other_arr, fit_ind,
                        pep_ind, onesol = {}, sol = [];

                //start by verifying cycles, peptides and exposures.
                get_params = verify_get_input(get_params);
                peps = get_params.peptides;
                exps = get_params.exposures;
                cycs = get_params.cycles;
                types = get_params.hasOwnProperty("type")
                    ? get_params.type
                    : get_params.hasOwnProperty("types")
                        ? get_params.types
                        : type_list;

                //Now verify type
                if (typeof types === 'string' && types.match(/kinetic|linear/i)) {
                    types = [types.toLowerCase()];
                } else if ( //This is a mess, essentially if it is an array that matches the right terms, accept it.
                    !Array.isArray(types) ||
                    !types.map(function (x, i) {
                        types[i] = types[i].toLowerCase();
                        if (x.match(/kinetic|linear/)) {
                            return 1;
                        } else {
                            return 0;
                        }
                    }).reduce(function (a, b) {
                        return a * b;
                    })
                ) {
                    types = type_list;
                }

                //finally actually return stuff
                for (i = 0; i < types.length; i += 1) {
                    // set up type based info
                    if (types[i] === "kinetic") {
                        dim2 = exps;
                        dim2Obj = exposure_object;
                        dim2_key = "exposure";
                        other_key = "cycle";
                        other_arr = cycs;
                    } else {
                        dim2 = cycs;
                        dim2Obj = cycle_object;
                        dim2_key = "cycle";
                        other_key = "exposure";
                        other_arr = exps;
                    }
                    //Now go through based on type variable
                    for (j = 0; j < dim2.length; j += 1) {
                        //Now go through based on peps
                        for (k = 0; k < peps.length; k += 1) {
                            fit_ind = dim2Obj[dim2[j]];
                            pep_ind = peptide_object[peps[k]].index;
                            onesol = {
                                peptide: peps[k],
                                type: types[i],
                                signal: that[types[i]].signal[fit_ind][pep_ind],
                                background: that[types[i]].background[fit_ind][pep_ind],
                                spot_row: peptide_object[peps[k]].row,
                                spot_column: peptide_object[peps[k]].col,
                                set: set_function(types[i], fit_ind, pep_ind, that),
                                more: more_function(fit_ind, peptide_object[peps[k]])
                            };
                            onesol[dim2_key] = dim2[j];
                            onesol[other_key] = copy(other_arr);
                            sol.push(onesol);
                        }
                    }
                }

                return sol;
            };

            define_lists = function (object) {
                var i, cyc, exp;

                //intialize
                cycle_list = [];
                cycle_object = {};
                exposure_list = [];
                exposure_object = {};
                peptide_list = [];
                peptide_object = {};

                //get peptide list
                define_peptide_list(object);

                //get cycles and exposures list
                for (i = 0; i < object.linear.cycles.length; i += 1) {
                    cyc = object.linear.cycles[i];
                    if (cyc === null) {
                        cyc = "Post Wash";
                    }
                    cycle_object[cyc] = i;
                }

                for (i = 0; i < object.kinetic.exposures.length; i += 1) {
                    exp = object.kinetic.exposures[i];
                    if (exp === null) {
                        exp = "Cycle Slope";
                    }
                    exposure_object[exp] = i;
                }

                cycle_list = Object.keys(cycle_object).map(mult1);
                exposure_list = Object.keys(exposure_object).map(mult1);
            };

            check_apppend_params = function (params) {
                var splitType;
                splitType = params.type.split(/_/);
                params.fit = splitType[1];
                params.sig_type = splitType[0];
                console.log(params, "need to write check append params function");
                return true;
            };

            list = function (list_term) {
                var ret;
                //just return copies of the list objects
                list_term = list_term || "";
                if (list_term.match(/peptide/i)) {
                    ret = copy(peptide_list);
                    ret.more = ret_full_pep_list;
                    return ret;
                }
                if (list_term.match(/exposure/i)) {
                    return copy(exposure_list);
                }
                if (list_term.match(/cycle/i)) {
                    return copy(cycle_list);
                }
                if (list_term.match(/type/i)) {
                    return copy(type_list);
                }
                ret = {
                    peptides: copy(peptide_list),
                    exposures: copy(exposure_list),
                    cycles: copy(cycle_list),
                    types: copy(type_list)
                };
                ret.peptides.more = ret_full_pep_list;
                return ret;
            };
        };

        //These may be generalizable
        ret_full_pep_list = function () {
            var i, ret = [], that = this;
            for (i = 0; i < that.length; i += 1) {
                ret.push(peptide_object[that[i]].full);
            }
            return ret;
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

        //These are general functions
        blank_array = function (length) {
            var i, res = [];
            for (i = 0; i < length; i += 1) {
                res.push(undefined);
            }
            return res;
        };

        define_peptide_list = function (object) {
            var i, j, indFor_Row, indFor_ID, indFor_Col, key;
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
        } else if (!object.hasOwnProperty('get') && object.level.match(/^1\.\d\.\d/)) {
            //basics
            level_1_helpers(); // define level 1 helper functions
            Object.defineProperty(object, 'clone', {value: clone, enumerable: false});
            Object.defineProperty(object, 'stringify', {value: stringify, enumerable: false});

            //get, append, and list
            define_lists(object);
            Object.defineProperty(object, 'get', {value: get, enumerable: false});
            Object.defineProperty(object, 'list', {value: list, enumerable: false});
            Object.defineProperty(object, 'put', {value: append, enumerable: false});

            //specialized
            Object.defineProperty(object, 'level_up', {value: level_up, enumerable: false});
        } else if (!object.hasOwnProperty('get') && object.level.match(/^2\.\d\.\d/)) {
            //basics
            level_2_helpers();
            Object.defineProperty(object, 'clone', {value: clone, enumerable: false});
            Object.defineProperty(object, 'stringify', {value: stringify, enumerable: false});

            //get, append, and list
            define_lists(object);
            Object.defineProperty(object, 'get', {value: get, enumerable: false});
            Object.defineProperty(object, 'list', {value: list, enumerable: false});
            Object.defineProperty(object, 'put', {value: append, enumerable: false});
        }
        return object;
    };
    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
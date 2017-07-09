/*global KINOME*/
(function (exports) {
    'use strict';

    exports.enrich = function (OBJECT) {
        /*
        The idea here is to take an object or an array and outfit it with get
        and list functions. This is to make it easier to grab the data of
        interest. It just needs to know the level of the data. Only works for
        level 1 for now...
        */
            /*defined by level*/
        var get, list, define_lists, append, level_up, eval_equation,
            /*generalizable*/
                clone, stringify, ID = "_id",
            /*Super objects*/
                cycle_list, cycle_object,
                peptide_list, peptide_object,
                exposure_list, exposure_object,
            /*glob helpers*/
                level_1_helpers, level_2_helpers, copy, mult1, blank_array,
                ret_full_pep_list, define_peptide_list, verify_get_input,
                array_level_helpers, name_helpers, addSuperMeta;

        //Based on the type we will define a series of functions
        level_1_helpers = function () {
            var set_function, more_function, get_image,
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
                                retArr.push(addSuperMeta({
                                    peptide: peps[i],
                                    cycle: cycs[j],
                                    exposure: exps[k],
                                    signal: that.signal[img_ind][pep_ind],
                                    signal_valid: that.signal_valid[img_ind][pep_ind],
                                    background: that.background[img_ind][pep_ind],
                                    background_valid: that.background_valid[img_ind][pep_ind],
                                    spot_row: peptide_object[peps[i]].row * 1,
                                    spot_col: peptide_object[peps[i]].col * 1,
                                    image: get_image(img_ind, that),
                                    set: set_function(img_ind, pep_ind, that),
                                    more: more_function(img_ind, peptide_object[peps[i]])
                                }, that));
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

            get_image = function (ind, data) {
                var i;
                for (i = 0; i < data.run_data.length; i += 1) {
                    if (data.run_data[i].key.match(/image/i)) {
                        return data.run_data[i].value[ind];
                    }
                }
                return;
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
                            if (
                                Array.isArray(that.run_data[i].value) &&
                                    that.run_data[i].value.length === that.cycles.length - 1
                            ) {
                                that.run_data[i].value.push(undefined);
                            }
                        }
                        //Now update the lists and redefine get result and continue on
                        define_lists(that);

                        get_result = that.get({peptide: pep, cycle: cyc, exposure: exp});
                    }

                    // if (get_result.length === 0) {
                    //     console.log({peptide: pep, cycle: cyc, exposure: exp});
                    // }

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
                            !Number.isNaN(params.value) && !Number.isNaN(params.valid) &&
                            !Number.isNaN(params.cycle) && !Number.isNaN(params.exposure) &&
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
                if (typeof list_term !== 'string') {
                    list_term = "";
                    console.warn('list should only be passed a string');
                }
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

            level_up = function (equation_str) {
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
                //delete start[ID];

                if (typeof equation_str !== "string") {
                    console.error("No equation string passed in, please pass in a string with the needed parts. Example: https://github.com/adussaq/kinome_toolbox/blob/master/models/cyclingEq_3p_hyperbolic.jseq");
                }

                start.linear = {
                    signal: [],
                    background: [],
                    cycles: []
                };
                start.kinetic = {
                    signal: [],
                    background: [],
                    exposures: [],
                    equation_string: equation_str
                };

                start.level = start.level.replace(/^1/, "2");

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
                        signal|background: object
                        //To find it
                        type: /linear|kinetic/
                        peptide: string
                        if linear :
                            cycle: null or number [Note: null === post wash]
                        if kinetic:
                            exposure: null or number [Note: null === cycle slope]
                    This then adds the data to the data array, then the appropriate
                    slopes, cycle number, and meta data stuff
                */
                var that = this, val, pep, exp, cyc, get_result, type, val_t;
                if (check_apppend_params(appendParams)) {
                    val = appendParams.value;
                    pep = appendParams.peptide;
                    cyc = appendParams.cycle;
                    exp = appendParams.exposure;
                    type = appendParams.type;
                    val_t = appendParams.signal_type;

                    //Get started with easy option, already added this combo
                    get_result = that.get({peptide: pep, type: type, cycle: cyc, exposure: exp});
                    if (get_result.length !== 1) {
                        //This point does not exist yet, we have to add stuff everywhere.
                        // Start with the data, this all has to grow at the same time.
                        if (type === 'kinetic') {
                            that.kinetic.signal.push(blank_array(that.peptides.length));
                            that.kinetic.background.push(blank_array(that.peptides.length));
                            that.kinetic.exposures.push(typeof exp === 'string'
                                ? null
                                : exp);
                        } else if (type === 'linear') {
                            that.linear.signal.push(blank_array(that.peptides.length));
                            that.linear.background.push(blank_array(that.peptides.length));
                            that.linear.cycles.push(typeof cyc === 'string'
                                ? null
                                : cyc);
                        }

                        //Now update the lists and redefine get result and continue on
                        define_lists(that);

                        get_result = that.get({peptide: pep, type: type, cycle: cyc, exposure: exp});
                    }

                    //Either this point existed, or it now does, so set it.
                    get_result[0].set(val_t, val);
                    return true;
                }
                console.error('Failed to set, one or more parameters were missing or invalid.');
                return false;
            };

            set_function = function (type, fit_ind, pep_ind, data) {
                return function (key, value) {
                    var that = this;
                    if (typeof key === 'string') {
                        key = key.toLowerCase();
                        if (key.match(/^signal$|^background$/m)) {
                            data[type][key][fit_ind][pep_ind] = value;
                            that[key] = value; //do this so the object itself is updated.
                        } else {
                            console.error("failed to set, key invalid");
                        }
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
                } else if ( //This is a mess, essentially if it is not an array or it doesn't matches the right terms, deny it, and use the entire list.
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
                                spot_row: peptide_object[peps[k]].row * 1,
                                spot_col: peptide_object[peps[k]].col * 1,
                                set: set_function(types[i], fit_ind, pep_ind, that),
                                more: more_function(fit_ind, peptide_object[peps[k]])
                            };
                            onesol[dim2_key] = dim2[j];
                            onesol[other_key] = copy(other_arr);
                            onesol = addSuperMeta(onesol, that);
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
                /*
                    This needs get get all the parameters passed in. They are:
                        //To add
                        signal|background: number
                        //To find it
                        type: /linear|kinetic/
                        peptide: string
                        if linear :
                            cycle: null or number [Note: null === post wash]
                        if kinetic:
                            exposure: null or number [Note: null === cycle slope]
                    This then adds the data to the data array, then the appropriate
                    slopes, cycle number, and meta data stuff
                */
                var val, val_type, good = false;

                params = params || {};

                // fix cycle and exposure
                params.exposure = params.exposure === null
                    ? "Cycle Slope"
                    : params.exposure;
                params.cycle = params.cycle === null
                    ? "Post Wash"
                    : params.cycle;

                //define value
                if (params.hasOwnProperty('signal') && !params.hasOwnProperty('background')) {
                    val = params.signal;
                    val_type = 'signal';
                } else if (!params.hasOwnProperty('signal') && params.hasOwnProperty('background')) {
                    val = params.background;
                    val_type = 'background';
                }

                //start checking
                                //This is for value (background or signal pointed to something)
                if (val_type) {
                                //This checks for type (linear or kinetic)
                    if (typeof params.type === 'string' && params.type.match(/^linear$|^kinetic$/m)) {
                                //This checks for a peptide
                        if (typeof params.peptide === 'string' && peptide_object.hasOwnProperty(params.peptide)) {
                                //now check for cycle or exposure
                            if (params.type === 'linear' && (typeof params.cycle === "number" || params.cycle === "Post Wash")) {
                                good = true;
                            } else if (typeof params.exposure === "number" || params.exposure === "Cycle Slope") {
                                good = true;
                            }
                        }
                    }
                }

                //make a couple changes to params
                params.signal_type = val_type;
                params.value = val;

                //return good or bad
                return good;
            };

            eval_equation = function (obj) {
                var nl_equation = {};
                if (!obj.kinetic.equation && obj.kinetic.equation_string) {
                    eval('nl_equation = ' + obj.kinetic.equation_string);
                    obj.kinetic.equation = nl_equation;
                }

                //define the linear function one
                obj.linear.equation = obj.linear.equation || {
                    description: "For fitting linear data",
                    displayEq: function (params) {
                        return 'y(e)=' + params[0].toFixed(2) + '·e+' + params[1].toFixed(2);
                    },
                    func: function (X, p) {
                        return X[0] * p[0] + p[1];
                    },
                    mathParams: ['m', 'b'],
                    mathType: 'y(e)=m·e+b',
                    name: 'linear',
                    stringified: "y(e) = m · e + b"
                };
                return obj;
            };

            list = function (list_term) {
                var ret;
                //just return copies of the list objects
                list_term = list_term || "";

                if (typeof list_term !== 'string') {
                    list_term = "";
                    console.warn('list should only be passed a string');
                }

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

        addSuperMeta = function (obj, data) {
            var url;
            if (data.group !== undefined) {
                obj.group = data.group;
            }
            if (data.level.match(/^2/) && typeof location === 'object' && location.href) {
                url = data.data_origin_url;
                if (url) {
                    url = url.replace(/\/*\?[\s\S]*$/, '')
                        .replace(/\/lvl_2/, '/lvl_1');
                    url = url + '?find={"name_id":"' + data.name_id + '"}';
                    url = './?data=*[' + encodeURIComponent(url) + ']*';
                    obj.lvl_1 = url;
                }
            }
            obj.name = data.name;
            obj.level = data.level;
            return obj;
        };

        array_level_helpers = function () {
            var check_new_get_params, allLists, mergeArrays;

            mergeArrays = function (a1, a2) {
                var i, obj = {};
                for (i = 0; i < a1.length; i += 1) {
                    obj[a1[i]] = 1;
                }
                for (i = 0; i < a2.length; i += 1) {
                    obj[a2[i]] = 1;
                }
                return Object.keys(obj);
            };
            define_lists = function (arr) {
                var group_obj = {}, name_obj = {}, id_obj = {}, i,
                        levels_obj = {}, lists_one, listKeys;

                allLists = {};

                arr.map(function (samp) {
                    lists_one = samp.list();
                    listKeys = Object.keys(lists_one);
                    for (i = 0; i < listKeys.length; i += 1) {
                        if (allLists.hasOwnProperty(listKeys[i])) {
                            mergeArrays(allLists[listKeys[i]], lists_one[listKeys[i]]);
                        } else {
                            allLists[listKeys[i]] = lists_one[listKeys[i]];
                        }
                    }
                    group_obj[samp.group] = 1;
                    name_obj[samp.name] = 1;
                    id_obj[samp.name_id] = 1;
                    levels_obj[samp.level] = 1;
                });

                allLists.cycles = allLists.cycles.map(mult1);
                allLists.exposures = allLists.exposures.map(mult1);
                allLists.groups = Object.keys(group_obj).map(mult1);
                allLists.names = Object.keys(name_obj);
                allLists.ids = Object.keys(id_obj);
                allLists.levels = Object.keys(levels_obj);

                // peptide_list = allLists.peptides;
                // cycle_list = allLists.cycles.map(mult1);
                // exposure_list = allLists.exposures.map(mult1);
                // group_list = Object.keys(group_obj).map(mult1);
                // name_list = Object.keys(name_obj);
                // id_list = Object.keys(id_obj);
                // levels_list = Object.keys(levels_obj);
            };
            get = function (get_params) {
                var i, that = this, ret = [];
                get_params = check_new_get_params(get_params);
                for (i = 0; i < that.length; i += 1) {
                    //check if the sample matches
                    if (
                        that[i].name.match(get_params.names) &&
                        that[i].group.toString().match(get_params.groups) &&
                        that[i].level.match(get_params.levels) &&
                        that[i].name_id.match(get_params.ids)
                    ) {
                        if (get_params.get_samples) {
                            ret = ret.concat(that[i]);
                        } else {
                            ret = ret.concat(that[i].get(get_params));
                        }
                    }
                }
                return ret;
            };
            list = function (list_str) {
                list_str = list_str || "";
                if (typeof list_str !== 'string') {
                    list_str = "";
                    console.warn('list should only be passed a string');
                }
                var i, listKeys = Object.keys(allLists);
                for (i = 0; i < listKeys.length; i += 1) {
                    if (list_str.match(new RegExp('^' + listKeys[i].replace(/^\^/, ''), 'i')) || listKeys[i].match(new RegExp(list_str, 'i'))) {
                        return copy(allLists[listKeys[i]]);
                    }
                }
                return copy(allLists);
            };
            check_new_get_params = function (getParams) {
                var grps, nms, ids, lvls, ret;
                getParams = getParams || {};
                grps = getParams.hasOwnProperty("groups")
                    ? getParams.groups
                    : getParams.hasOwnProperty("group")
                        ? getParams.group
                        : allLists.groups;
                if (!Array.isArray(grps)) {
                    grps = [grps];
                }

                grps = new RegExp('^' + grps.join('$|^') + '$', 'i');

                nms = getParams.hasOwnProperty("names")
                    ? getParams.names
                    : getParams.hasOwnProperty("name")
                        ? getParams.name
                        : allLists.names;

                if (!Array.isArray(nms)) {
                    nms = [nms];
                }

                nms = new RegExp('^' + nms.join('$|^') + '$', 'i');

                ids = getParams.hasOwnProperty("ids")
                    ? getParams.ids
                    : getParams.hasOwnProperty("id")
                        ? getParams.id
                        : allLists.ids;

                if (!Array.isArray(ids)) {
                    ids = [ids];
                }

                ids = new RegExp('^' + ids.join('$|^') + '$', 'i');

                lvls = getParams.hasOwnProperty("levels")
                    ? getParams.levels
                    : getParams.hasOwnProperty("level")
                        ? getParams.level
                        : allLists.levels;

                if (!Array.isArray(lvls)) {
                    lvls = [lvls];
                }

                lvls = new RegExp('^' + lvls.join('$|^') + '$', 'i');

                ret = copy(getParams);
                delete ret.level;
                delete ret.group;
                delete ret.id;
                delete ret.name;
                ret.levels = lvls;
                ret.groups = grps;
                ret.ids = ids;
                ret.names = nms;

                return ret;
            };
        };

        name_helpers = function () {
            var get_image;
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
                                    spot_row: peptide_object[peps[i]].row * 1,
                                    spot_col: peptide_object[peps[i]].col * 1,
                                    image: get_image(img_ind, that)
                                });
                            }
                        }
                    }
                }

                return retArr;
            };
            get_image = function (ind, data) {
                var i;
                for (i = 0; i < data.run_data.length; i += 1) {
                    if (data.run_data[i].key.match(/image/i)) {
                        return data.run_data[i].value[ind];
                    }
                }
                return;
            };
            list = function (list_term) {
                var ret;
                //just return copies of the list objects
                list_term = list_term || "";
                if (typeof list_term !== 'string') {
                    list_term = "";
                    console.warn('list should only be passed a string');
                }
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
        };

        //These may be generalizable
        ret_full_pep_list = function () {
            var i, j, ret = [], that = this, oneRet, row, col, found;
            for (i = 0; i < that.length; i += 1) {
                found = 0;
                //get one of them
                oneRet = copy(peptide_object[that[i]].full);

                //now find spotCol and spotRow
                for (j = 0; found < 2 && j < oneRet.length; j += 1) {
                    if (oneRet[j].key.match(/spotRow/i)) {
                        row = parseInt(oneRet[j].value, 10);
                        found += 1;
                    } else if (oneRet[j].key.match(/spotCol/i)) {
                        col = parseInt(oneRet[j].value, 10);
                        found += 1;
                    }
                }

                Object.defineProperty(oneRet, 'pos', {value: {spot_row: row, spot_col: col}, enumerable: false});
                Object.defineProperty(oneRet, 'name', {value: that[i], enumerable: false});
                ret.push(oneRet);
            }
            return ret;
        };

        verify_get_input = function (getParams) {
            var peps, cycs, exps, i, ret;
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

            ret = copy(getParams);
            ret.cycles = cycs;
            ret.exposures = exps;
            ret.peptides = peps;
            delete ret.cycle;
            delete ret.exposure;
            delete ret.peptide;

            return ret;
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
            var that = this, newcopy, l1, l2, i, j;
            //Uses simple p/s to return a getted version of the object
            newcopy = copy(that);
            l1 = Object.getOwnPropertyNames(that);
            l2 = Object.getOwnPropertyNames(newcopy);

            for (i = 0; i < l1.length; i += 1) {
                for (j = 0; j < l2.length; j += 1) {
                    if (l1[i] === l2[j]) {
                        l1.splice(i, 1);
                        l2.splice(j, 1);
                        i -= 1;
                        break;
                    }
                }
            }
            for (i = 0; i < l1.length; i += 1) {
                if (typeof that[l1[i]] !== 'function') {
                    Object.defineProperty(newcopy, l1[i], {
                        enumerable: false,
                        configurable: false,
                        writable: false,
                        value: that[l1[i]]
                    });
                }
            }
            //delete newcopy[ID];
            return exports.enrich(newcopy);
        };

        mult1 = function (x) {
            //for map
            if (typeof x === 'string' && x.match(/Post\sWash|Cycle\sSlope/i)) {
                return x;
            }
            return x * 1;
        };

        stringify = function () {
            var that = this.clone();
            //idea here is just to round numbers to 6 decimal point then call
            // JSON.stringify.

            //delete that[ID];

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
        if (Array.isArray(OBJECT) && OBJECT.length > 0) {
            //enrich the lower level objects
            OBJECT = OBJECT.map(function (x) {
                return exports.enrich(x); //recursively call this function
            });
            //now rely on those to enrich the array

            //basics
            array_level_helpers(); // define this level helper functions
            Object.defineProperty(OBJECT, 'clone', {value: clone, enumerable: false});
            Object.defineProperty(OBJECT, 'stringify', {value: stringify, enumerable: false});

            //get and list
            define_lists(OBJECT);
            Object.defineProperty(OBJECT, 'get', {value: get, enumerable: false});
            Object.defineProperty(OBJECT, 'list', {value: list, enumerable: false});
        } else if (typeof OBJECT === 'object' && !Array.isArray(OBJECT) && !OBJECT.hasOwnProperty('get') && OBJECT.level && OBJECT.level.match(/^1\.\d\.\d/)) {
            //basics
            level_1_helpers(); // define level 1 helper functions
            Object.defineProperty(OBJECT, 'clone', {value: clone, enumerable: false});
            Object.defineProperty(OBJECT, 'stringify', {value: stringify, enumerable: false});

            //get, append, and list
            define_lists(OBJECT);
            Object.defineProperty(OBJECT, 'get', {value: get, enumerable: false});
            Object.defineProperty(OBJECT, 'list', {value: list, enumerable: false});
            Object.defineProperty(OBJECT, 'put', {value: append, enumerable: false});

            //specialized
            Object.defineProperty(OBJECT, 'level_up', {value: level_up, enumerable: false});
        } else if (typeof OBJECT === 'object' && !Array.isArray(OBJECT) && !OBJECT.hasOwnProperty('get') && OBJECT.level && OBJECT.level.match(/^2\.\d\.\d/)) {
            //basics
            level_2_helpers();
            Object.defineProperty(OBJECT, 'clone', {value: clone, enumerable: false});
            Object.defineProperty(OBJECT, 'stringify', {value: stringify, enumerable: false});

            //get, append, and list
            define_lists(OBJECT);
            Object.defineProperty(OBJECT, 'get', {value: get, enumerable: false});
            Object.defineProperty(OBJECT, 'list', {value: list, enumerable: false});
            Object.defineProperty(OBJECT, 'put', {value: append, enumerable: false});

            //specail level t
            eval_equation(OBJECT);
        } else if (typeof OBJECT === 'object' && !Array.isArray(OBJECT) && !OBJECT.hasOwnProperty('get') && OBJECT.level && OBJECT.level.match(/name/)) {
            //basics
            name_helpers();
            Object.defineProperty(OBJECT, 'clone', {value: clone, enumerable: false});
            Object.defineProperty(OBJECT, 'stringify', {value: stringify, enumerable: false});

            //get and list - both do nothing for names
            define_lists(OBJECT);
            Object.defineProperty(OBJECT, 'get', {value: get, enumerable: false});
            Object.defineProperty(OBJECT, 'list', {value: list, enumerable: false});
        }
        return OBJECT;
    };
    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
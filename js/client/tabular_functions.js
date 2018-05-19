var TABULAR = {};
(function (exports) {
    'use strict';

    exports.enrich = function (OBJECT) {
        // Global lists
        var header, rowLab, rowLabLab, dataArr, headerObj, rowObj,
                // global functions
                tabularHelpers, defineLists, parseLabels, copy,
                // helper functions
                get, stringify, clone;

        parseLabels = function () {
            var i, that = copy(OBJECT);

            // Header labels?
            if (!that.header && that.has_header) {
                that.header = that.data.shift();
                //Do we have a row label?
                if (that.has_row_label) {
                    that.row_label_name = that.header.shift();
                    if (that.row_label_name.length === 0) {
                        delete that.row_label_name;
                    }
                }
            //No header - create an index based one
            } else if (!that.header) {
                that.header = [];
                for (i = 0; i < that.data[0]; i += 1) {
                    that.header.push(i);
                }
            }

            // Row labels?
            if (!that.row_labels && that.has_row_label) {
                that.row_labels = that.data.map(function (row) {
                    return row.shift();
                });
            } else if (!that.row_labels) {
                that.row_labels = [];
                for (i = 0; i < that.data; i += 1) {
                    that.row_labels.push(i);
                }
            }

            //Now creat data array from what left
            that.data = that.data.map(function (row) {
                return row.map(function (entry) {
                    if (Number.isFinite(entry * 1)) {
                        return entry * 1;
                    }
                });
            });

            //redefine global OBJECT
            OBJECT = that;
        };

        defineLists = function () {
            //Fix label repeats and assign global variables
            var i, spec = 1, that = OBJECT;
            header = that.header;
            rowLab = that.row_labels;
            rowLabLab = that.row_label_name;
            dataArr = that.data;
            headerObj = {};
            rowObj = {};

            //Store header names in a hash
            for (i = 0; i < header.length; i += 1) {
                while (headerObj.hasOwnProperty(header[i])) {
                    if (spec > 1) {
                        header[i] = header[i].replace(
                            new RegExp("_" + (spec - 1) + "$"),
                            ""
                        );
                    }
                    header[i] = header[i] + "_" + spec;
                    spec += 1;
                }
                headerObj[header[i]] = i;
                spec = 1;
            }

            //Finally create row label hash
            for (i = 0; i < rowLab.length; i += 1) {
                while (rowObj.hasOwnProperty(rowLab[i])) {
                    if (spec > 1) {
                        rowLab[i] = rowLab[i].replace(
                            new RegExp("_" + (spec - 1) + "$"),
                            ""
                        );
                    }
                    rowLab[i] = rowLab[i] + "_" + spec;
                    spec += 1;
                }
                rowObj[rowLab[i]] = i;
                spec = 1;
            }
        };

        tabularHelpers = function () {
            get = function (get_param, simple) {
                // Possible parameters: Header label vs number; Column label vs number
                var rows, heads, i, j, retArr = [], row_by_ind = false,
                        head_by_ind = false, temp_row, ret_row_label,
                        ret_head_label;

                //deal with header input
                get_param = get_param || {};
                if (get_param.hasOwnProperty('header')) {
                    heads = get_param.header;
                } else if (get_param.hasOwnProperty('headers')) {
                    heads = get_param.headers;
                } else if (get_param.hasOwnProperty('header_index')) {
                    heads = get_param.header_index;
                    head_by_ind = true;
                } else if (get_param.hasOwnProperty('header_indexes')) {
                    heads = get_param.header_indexes;
                    head_by_ind = true;
                } else if (get_param.hasOwnProperty('header_indices')) {
                    heads = get_param.header_indices;
                    head_by_ind = true;
                } else if (get_param.hasOwnProperty('column')) {
                    heads = get_param.column;
                } else if (get_param.hasOwnProperty('columns')) {
                    heads = get_param.columns;
                } else if (get_param.hasOwnProperty('column_index')) {
                    heads = get_param.column_index;
                    head_by_ind = true;
                } else if (get_param.hasOwnProperty('column_indexes')) {
                    heads = get_param.column_indexes;
                    head_by_ind = true;
                } else if (get_param.hasOwnProperty('column_indices')) {
                    heads = get_param.column_indices;
                    head_by_ind = true;
                } else {
                    heads = header;
                }

                //convert to array if it is a single value
                if (typeof heads !== 'object' && !Array.isArray(heads)) {
                    heads = [heads];
                }

                //deal with rowumins input
                if (get_param.hasOwnProperty('row')) {
                    rows = get_param.row;
                } else if (get_param.hasOwnProperty('rows')) {
                    rows = get_param.rows;
                } else if (get_param.hasOwnProperty(rowLabLab)) {
                    rows = get_param[rowLabLab];
                } else if (get_param.hasOwnProperty(rowLabLab + 's')) {
                    rows = get_param[rowLabLab + 's'];
                } else if (get_param.hasOwnProperty(rowLabLab + 'es')) {
                    rows = get_param[rowLabLab + 'es'];
                } else if (get_param.hasOwnProperty('row_index')) {
                    rows = get_param.row_index;
                    row_by_ind = true;
                } else if (get_param.hasOwnProperty('row_indexes')) {
                    rows = get_param.row_indexes;
                    row_by_ind = true;
                } else if (get_param.hasOwnProperty('row_indices')) {
                    rows = get_param.row_indices;
                    row_by_ind = true;
                } else {
                    rows = rowLab;
                }

                //convert to array if it is a single value
                if (typeof rows !== 'object' && !Array.isArray(rows)) {
                    rows = [rows];
                }

                if (!Array.isArray(heads) || !Array.isArray(rows)) {
                    console.error('Invalid Get Parameters');
                    return false;
                }

                ret_row_label = [];
                ret_head_label = [];
                for (i = 0; i < rows.length; i += 1) {
                    //grab the rows of interest
                    retArr[i] = [];
                    if (row_by_ind) {
                        temp_row = dataArr[rows[i]];
                        ret_row_label[i] = rowLab[rows[i]];
                    } else {
                        temp_row = dataArr[rowObj[rows[i]]];
                        ret_row_label[i] = rows[i];
                    }
                    //grab the appropriate columns
                    for (j = 0; j < heads.length; j += 1) {
                        if (head_by_ind) {
                            retArr[i].push(temp_row[heads[j]]);
                            ret_head_label[j] = header[heads[j]];
                        } else {
                            retArr[i].push(temp_row[headerObj[heads[j]]]);
                            ret_head_label[j] = heads[j];
                        }
                    }
                }
                if (simple) {
                    retArr = retArr.map(function (row) {
                        if (row.length === 1) {
                            return row[0];
                        }
                        return row;
                    });
                    if (retArr.length === 1) {
                        retArr = retArr[0];
                    }
                    return retArr;
                }

                return exports.enrich({
                    data: retArr,
                    header: ret_head_label,
                    row_labels: ret_row_label,
                    row_label_name: rowLabLab
                });
            };

            stringify = function () {
                var that = this.clone(), i, j;
                for (i = 0; i < that.data.length; i += 1) {
                    for (j = 0; j < that.data[i].length; j += 1) {
                        if (that.data[i][j] && typeof that.data[i][j] === 'number') {
                            //round it, note if it is an integer or has less than 6
                            // digits it will go back to where it was. Also, toPrecision
                            // is a significant figure finder, not a decimal finder
                            // meaning this will drop all but 6 digits to represent a
                            // number
                            that.data[i][j] = that.data[i][j].toPrecision(6) * 1;
                        }
                    }
                }
                return JSON.stringify(that);
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
        };

        copy = function (x) {
            //Just copies
            return JSON.parse(JSON.stringify(x));
        };


        if (typeof OBJECT === 'object' && !Array.isArray(OBJECT) && !OBJECT.hasOwnProperty('get')) {
            parseLabels();
            defineLists();
            tabularHelpers();
            Object.defineProperty(OBJECT, 'clone', {value: clone, enumerable: false});
            Object.defineProperty(OBJECT, 'stringify', {value: stringify, enumerable: false});
            Object.defineProperty(OBJECT, 'get', {value: get, enumerable: false});
            return OBJECT;
        }
    };

    exports.parse = function (file_string) {
        return file_string.replace(/^\s*$/mg, '').split('\n').map(function (y) {
            return y.split('\t');
        });
    };

}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : TABULAR
));

/*global $, jQuery, KINOME*/

/*
    This loads in the names that I use for the paper and the names database for
    The other stuff.
    http://127.0.0.1:8000/database.html?data=[http://192.168.56.1:8080/kinomics/names]&data=[http://192.168.56.1:8080/paper1_kinome_random/names]&code=database/set_up_table.js

    Still to do: set up the data url stuff for actually making the urls
*/

//Body functions
(function () {
    'use strict';
    var $page = KINOME.page, tableObject, tableWidth = 3, //number of dropdowns
            //functions
            getTableData, getHeader, addFirstHeaderRow,
            addSecondHeaderRow, buildTableBody, createPaginationDivs,
            buildLinks;

    //function definitions
    getTableData = function (names) {
        var i, k, retArray = [], entry, id = '_id', tempObj, headerStart = {}, headerPossible = {};
        for (i = 0; i < names.length; i += 1) {
            entry = names[i];
            tempObj = {url: names[i].url, database: {}, table: {}};
            tempObj.table.name = entry.name;
            tempObj.table.group = undefined;
            tempObj.table.id = entry[id];

            //sample data part of entry
            for (k = 0; k < entry.sample_data.length; k += 1) {
                if (tempObj.database[entry.sample_data[k].key]) {
                    tempObj.database[entry.sample_data[k].key] = [
                        tempObj.database[entry.sample_data[k].key],
                        entry.sample_data[k].value
                    ];
                } else {
                    tempObj.database[entry.sample_data[k].key] =
                            entry.sample_data[k].value;
                    headerStart[entry.sample_data[k].key] = 1;
                }

            }
            //machine data part of entry
            for (k = 0; k < entry.run_data.length; k += 1) {
                if (tempObj.database[entry.run_data[k].key]) {
                    tempObj.database[entry.run_data[k].key] = [
                        tempObj.database[entry.run_data[k].key],
                        entry.run_data[k].value
                    ];
                } else {
                    tempObj.database[entry.run_data[k].key] =
                            entry.run_data[k].value;
                    headerPossible[entry.run_data[k].key] = 1;
                }
            }
            retArray.push(tempObj);
        }
        return {
            data: retArray,
            header: Object.keys(headerStart),
            possible: Object.keys(headerPossible),
            header_options: Object.keys(headerStart).concat(Object.keys(headerPossible)).map(function (x) {
                // create actual elements
                return $('<option value="' + x + '">' + x + '</option>');
            })
        };
    };

    getHeader = function (namesDataTableObject) {
        var i, current = namesDataTableObject.header,
                possible = namesDataTableObject.possible;

        //if it is too long
        while (current.length > tableWidth) {
            current.pop();
        }

        //if it is too short
        for (i = 0; i < possible.length && current.length < tableWidth; i += 1) {
            current.push(possible[i]);
        }

        //now format header object
        for (i = 0; i < current.length; i += 1) {
            current[i] = [current[i], new RegExp("", "i")];
        }

        return current;
    };

    addFirstHeaderRow = function ($elem) {
        var $headerRow, $temp, i, j, $opt, update;

        update = function (index) {
            return function (evt) {
                var newKey = evt.target.value;
                tableObject.header[index][0] = newKey;
                buildTableBody();
            };

        };

        $headerRow = $('<tr>').appendTo($elem);
        $headerRow.append('<th>Analysis<br />Group</th>');
        $headerRow.append('<th>Barcode, Row</th>');

        for (i = 0; i < tableObject.header.length; i += 1) { //by entry
            $temp = $('<th>').appendTo($headerRow);
            if (i > 0) {
                $temp.addClass('hidden-xs');
            }
            $temp = $('<select>', {class: 'form-control'}).appendTo($temp);
            for (j = 0; j < tableObject.header_options.length; j += 1) {
                $opt = tableObject.header_options[j].clone();
                if ($opt.text() === tableObject.header[i][0]) {
                    $opt.attr('selected', 'selected');
                }
                $temp.append($opt);
            }
            $temp.change(update(i));
        }
    };

    addSecondHeaderRow = function ($elem) {
        var i, $temp, changeFilter, $row;

        changeFilter = function (index) {
            return function (evt) {
                if (index === -2) {
                    tableObject.group_filter = new RegExp(evt.target.value, 'i');
                } else if (index === -1) {
                    tableObject.name_filter = new RegExp(evt.target.value, 'i');
                } else {
                    tableObject.header[index][1] = new RegExp(evt.target.value, 'i');
                }
                buildTableBody();
            };
        };
        $row = $('<tr>').appendTo($elem);
        for (i = -2; i < tableObject.header.length; i += 1) { // make the select boxes
            $temp = $('<th>').appendTo($row);
            if (i > 0) {
                $temp.addClass('hidden-xs');
            }
            $temp = $('<input>', {type: 'text', class: 'form-control'}).appendTo($temp);
            if (i > -2) {
                $temp.attr('placeholder', 'regex filter');
            } else {
                $temp.css("max-width", "60px");
            }
            $temp.keyup(changeFilter(i));
        }
        return;
    };

    createPaginationDivs = function () {
        var currentPage, $temp;
        $temp = $('<div>', {class: 'text-center'}).appendTo($page);
        $temp = $('<nav aria-label="Page navigation"></nav>').appendTo($temp);
        $temp = $('<ul class="pagination pagination-lg"></ul>').appendTo($temp);

        //left a page
        $('<a href="#" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a>').click(function (evt) {
            evt.preventDefault();
            tableObject.page = tableObject.page === 0
                ? 0
                : tableObject.page - 1;
            buildTableBody();
        }).appendTo($('<li>').appendTo($temp));

        //Current page
        currentPage = $('<a style="color: black" href="#"></a>').click(function (evt) {
            evt.preventDefault();
        }).appendTo($('<li>').appendTo($temp));

        $('<a href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a>').click(function (evt) {
            evt.preventDefault();
            tableObject.page += 1;
            buildTableBody();
        }).appendTo($('<li>').appendTo($temp));

        return currentPage;
    };

    buildLinks = function (groups) {
        var i, j, k, dataGroup, search, links, $element;
        $element = tableObject.link_out;

        //Add in something like this to the top of this list:
        // This does not account for missing databases, so if a given level
            // has not been created yet it will still be displayed as an option.

        //empty what is currently there
        $element.empty();

        search = "";
        for (i = 0; i < groups.length; i += 1) {
            search += "data=*[";
            dataGroup = {};
            for (j = 0; j < groups[i].length; j += 1) {
                dataGroup[groups[i][j].url] = dataGroup[groups[i][j].url] || [];
                dataGroup[groups[i][j].url].push(groups[i][j].table.id);
            }
            links = Object.keys(dataGroup);
            for (j = 0; j < links.length; j += 1) {
                search += links[j].replace('names', '<database>') + '?find={"names_id":{"$in":["';
                for (k = 0; k < dataGroup[links[j]].length; k += 1) {
                    search += dataGroup[links[j]][k] + '","';
                }
                search = search.replace(/,"$/, ']}};');
            }
            search = search.replace(/;$/, ']*&');
        }
        search = search.replace(/&$/, '');
        $element.text(search);
    };

    buildTableBody = function () {
        var row, i, tableLength, $element, pageNumber, max_length, data, tableKeys,
                updateGroup, maxGroup, tableIndex, goodEntry, tableText, nameFilter,
                temp, blank, groupFilter, goodEntries, groups;

        $element = tableObject.element;
        pageNumber = tableObject.page;
        nameFilter = tableObject.name_filter;
        groupFilter = tableObject.group_filter;
        max_length = tableObject.entries_per_page;
        data = tableObject.data;
        tableKeys = tableObject.header;
        maxGroup = -1;
        blank = "";
        groups = [];

        //clear current table
        $element.empty();

        updateGroup = function (i) {
            return function (evt) {
                tableObject.data[i].table.group = evt.target.value;
                buildTableBody();
            };
        };

        //determine the max group selected and build the links
        for (i = 0; i < data.length; i += 1) {
            if (data[i].table.group) {
                groups[data[i].table.group] = groups[data[i].table.group] || [];
                groups[data[i].table.group].push(data[i]);
                maxGroup = Math.max(maxGroup, data[i].table.group);
            }
        }
        maxGroup += 1;

        //fill in groups part of the page
        buildLinks(groups);

        //build new table
        tableLength = 0;
        tableIndex = 0;
        goodEntries = 0;

        while (tableIndex < data.length) {
            //check to see if the entry matches all of the filters
            goodEntry = true;
            //check group
            if (goodEntry && !blank.match(groupFilter)) {
                if (!data[tableIndex].table.group || !data[tableIndex].table.group.match(groupFilter)) {
                    goodEntry = false;
                }
            }

            //check barcode
            if (goodEntry && !data[tableIndex].table.name.match(nameFilter)) {
                goodEntry = false;
            }

            //check remaining keys
            for (i = 0; goodEntry && i < tableKeys.length; i += 1) {
                //each tableKey is an array [key, regexp]
                tableText = data[tableIndex].database[tableKeys[i][0]] || "";
                if (Array.isArray(tableText)) {
                    tableText = tableText.join('\n');
                }
                if (!tableText.match(tableKeys[i][1])) {
                    goodEntry = false;
                }
            }

            //add row if this is still ok
            if (goodEntry) {
                //change length to limit table length
                goodEntries += 1;
                if (goodEntries > pageNumber * max_length && tableLength < max_length) {
                    tableLength += 1;
                    //make row element
                    row = $('<tr>').appendTo($element);

                    //append the drop down for group
                    temp = $('<td>').appendTo(row);
                    temp = $('<select>', {class: 'form-control'}).appendTo(temp);
                    temp.append('<option selected value>None</option>');
                    for (i = 0; i <= maxGroup; i += 1) {
                        if (data[tableIndex].table.group * 1 === i) {
                            temp.append('<option selected="true" value="' + i + '">' + i + '</option>');
                        } else {
                            temp.append('<option value="' + i + '">' + i + '</option>');
                        }
                    }
                    temp.change(updateGroup(tableIndex));

                    //add the barcode
                    temp = $('<td>', {text: data[tableIndex].table.name}).appendTo(row);

                    //add in the other keys
                    for (i = 0; i < tableKeys.length; i += 1) {
                        temp = $('<td>').appendTo(row);
                        if (i > 0) {
                            temp.addClass('hidden-xs');
                        }
                        tableText = data[tableIndex].database[tableKeys[i][0]] || "";
                        if (Array.isArray(tableText)) {
                            if (tableText.length < 4) {
                                tableText = tableText.join('<br/>');
                            } else {
                                tableText = '[' + tableText.slice(0, 3).join(
                                    tableText.slice(0, 3).join('').length < 20
                                        ? ', '
                                        : ',<br/>'
                                ) + ', ...] (' + tableText.length + ')';
                            }
                        }
                        temp.html(tableText);
                    }
                }
            }

            //finally always change the table index
            tableIndex += 1;
        }

        //add in pagination
        tableObject.pagination.text((tableObject.page + 1) + ' / ' + Math.ceil(goodEntries / max_length));

        //this is hear to make sure I never go out of range
        if (tableLength < 1) {
            tableObject.page -= 1;
            buildTableBody();
        }
    };

    //Begin actual work

    var buildIt = function (database_arr) {
        var names_database, tableData, $table, $header;

        //grab all the names databases
        // names_database = getNamesDatabase();
        // names_database = KINOME.get({level: 'name'});
        // console.log(names_database, KINOME.get({level: 'name'}));
        tableData = getTableData(database_arr);

        $page.empty();

        //set up table object for building the table
        tableObject = {
            page: 0,
            entries_per_page: 8,
            name_filter: new RegExp("", "i"),
            group_filter: new RegExp("", "i")
        };
        tableObject.data = tableData.data;
        tableObject.header = getHeader(tableData);
        tableObject.header_options = tableData.header_options;

        //clear tableData (temp stuff)
        tableData = {};

        //create table
        $table = $('<table>', {class: 'table'}).appendTo($page);
        $header = $('<thead>').appendTo($table);

        //add in header rows
        addFirstHeaderRow($header);
        addSecondHeaderRow($header);

        //set up the body to build
        tableObject.element = $('<tbody>').appendTo($table);

        //add in pagination
        tableObject.pagination = createPaginationDivs();

        //add in url generated
        tableObject.link_out = $('<div>').appendTo($page);

        //now actually build the page
        buildTableBody();
    };

    var names_major = KINOME.list({level: 'name'});
    if (names_major.length) {
        buildIt(names_major);
    }
    var lvl1_0_1 = KINOME.list({level: '1.0.1'});
    if (lvl1_0_1.length) {
        buildIt(lvl1_0_1);
    }

    return [tableObject, $page];
}());
/*global $, jQuery, KINOME*/

/*
    This loads in the names that I use for the paper and the names database for
    The other stuff.
    http://127.0.0.1:8000/database.html?data=[http://192.168.56.1:8080/kinomics/names]&data=[http://192.168.56.1:8080/paper1_kinome_random/names]&code=database/set_up_table.js

    Still to do: set up the data url stuff for actually making the urls
*/

//Body functions
(function (exports) {
    'use strict';
    var $page = KINOME.page, tableWidth = 3, //number of dropdowns
            //functions
            getTableData, getHeader, addFirstHeaderRow,
            addSecondHeaderRow, buildTableBody, createPaginationDivs,
            buildLinks;

    //function definitions
    getTableData = function (names) {
        var i, k, retArray = [], entry, tempObj, headerStart = {}, headerPossible = {};
        for (i = 0; i < names.length; i += 1) {
            entry = names[i];
            tempObj = {url: names[i].data_origin_url, database: {}, table: {}};
            tempObj.table.name = entry.name;
            delete tempObj.table.group;
            tempObj.table.id = entry.name_id;
            tempObj.origin_db = entry;

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

    addFirstHeaderRow = function ($elem, tableObject) {
        var $headerRow, $temp, i, j, $opt, update;

        update = function (index) {
            return function (evt) {
                var newKey = evt.target.value;
                tableObject.header[index][0] = newKey;
                buildTableBody(tableObject);
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

    addSecondHeaderRow = function ($elem, tableObject) {
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
                buildTableBody(tableObject);
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

    createPaginationDivs = function (tableObject) {
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
            buildTableBody(tableObject);
        }).appendTo($('<li>').appendTo($temp));

        //Current page
        currentPage = $('<a style="color: black" href="#"></a>').click(function (evt) {
            evt.preventDefault();
        }).appendTo($('<li>').appendTo($temp));

        $('<a href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a>').click(function (evt) {
            evt.preventDefault();
            tableObject.page += 1;
            buildTableBody(tableObject);
        }).appendTo($('<li>').appendTo($temp));

        return currentPage;
    };

    buildLinks = function (groups, tableObject) {
        var i, j, k, dataGroup, search, links, $element, col1, col2, row,
                lvls = ['name', 'lvl_1.0.0', 'lvl_1.0.1', 'lvl_1.1.2', 'lvl_2.0.1', 'lvl_2.1.2'],
                descriptions = [];
        $element = tableObject.link_out;

        // for the table of the collections these correspond to lvls above
        descriptions = [
            "Name is a small collection containing only meta data. It is meant to allow you to build up groups in different ways. Also when only name data is present you may load in data from your own bionavigator output.",
            "1.0.0 is the raw data for background and signal combined. The only additional information is a flag indicating if the camera's ability to detect changes in signal was saturated.",
            "1.0.1 is the raw data following outlier detection as described in (link will be provided once published).",
            "1.1.2 is the raw data following background normalization as described in (link will be provided once published).",
            '2.0.1 is the results of curve parameterization as performed on level 1.0.1 data. Non linear curves were parameterized utilizing equation 3 from <a href="https://www.ncbi.nlm.nih.gov/pubmed/27601856">Dussaq et al</a>.',
            '2.1.2 is the results of curve parameterization as performed on level 1.1.2 data. Non linear curves were parameterized utilizing equation 3 from <a href="https://www.ncbi.nlm.nih.gov/pubmed/27601856">Dussaq et al</a>.'
        ];

        var cleanURL = function (str) {
            return str.replace(/\/*\?[\s\S]*$|\/$|\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/*$/gm, '');
        };

        //Add in something like this to the top of this list:
        // This does not account for missing databases, so if a given level
            // has not been created yet it will still be displayed as an option.

        //empty what is currently there
        $element.empty();

        // console.log(groups);

        search = "?";
        for (i = 0; i < groups.length; i += 1) {
            search += "data=*[";
            dataGroup = {};
            for (j = 0; groups[i] && j < groups[i].length; j += 1) {
                dataGroup[cleanURL(groups[i][j].url)] = dataGroup[cleanURL(groups[i][j].url)] || [];
                dataGroup[cleanURL(groups[i][j].url)].push(groups[i][j].table.id);
            }
            links = Object.keys(dataGroup);
            // console.log(links);
            for (j = 0; j < links.length; j += 1) {
                // console.log('here in table build', groups, dataGroup, links[j]);
                search += cleanURL(links[j]).replace(/\/[^\/]+$/, '/<database>') + '/';
                for (k = 0; k < dataGroup[links[j]].length; k += 1) {
                    search += dataGroup[links[j]][k] + '|';
                }
                search = search.replace(/\|$/, ';');
            }
            search = search.replace(/;$/, '');
            search += "]*&";
        }
        search = search.replace(/&$/, '');
        //make the display these for level names, 1.0.0, 1.0.1, 1.2.1, 2.0.1, 2.1.2
        if (groups.length > 0) {
            $element.append('<h1 class="page-header">Collections Possible</h1>');
            row = $('<div>', {class: 'row', style: "margin-bottom:20px;"}).appendTo($element);
            col1 = $('<dl>', {class: "dl-horizontal"}).appendTo($('<div>', {class: 'col col-xs-12'}).appendTo(row));
            for (i = 0; i < lvls.length; i += 1) {
                // if (i < Math.ceil(lvls.length / 2)) {
                col1.append('<dt><a class="lead" href="' + search.replace(/<database>/g, lvls[i]).replace(/"/g, "%22") + '">' + lvls[i] + '</a></dt>' + '<dd><p style="margin-bottom:20px;">' + descriptions[i] + '</p></dd>');
                // } else {
                    // col2.append('<li><a href="' + search.replace(/<database>/g, lvls[i]).replace(/"/g, "%22") + '">' + lvls[i] + '</a></li>');
                // }
            }
        }
        // $element.text(search);
    };

    buildTableBody = function (tableObject) {
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
                // console.log(evt.target.value, tableObject.data[i].table.group);
                buildTableBody(tableObject);
            };
        };

        //determine the max group selected and build the links
        for (i = 0; i < data.length; i += 1) {
            if (data[i].table.group !== undefined && data[i].table.group.toString().match(/\d+/)) {
                groups[data[i].table.group] = groups[data[i].table.group] || [];
                groups[data[i].table.group].push(data[i]);
                maxGroup = Math.max(maxGroup, data[i].table.group);
            }
        }
        maxGroup += 1;

        //fill in groups part of the page
        if (maxGroup > 0 && groups.length && groups[0].length) {
            buildLinks(groups, tableObject);
        }

        //build new table
        tableLength = 0;
        tableIndex = 0;
        goodEntries = 0;

        while (tableIndex < data.length) {
            //check to see if the entry matches all of the filters
            goodEntry = true;
            //check group
            if (goodEntry && !blank.match(groupFilter)) {
                if (data[tableIndex].table.group === undefined || !data[tableIndex].table.group.toString().match(groupFilter)) {
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
                    if (tableObject.table_type === 'name') {
                        temp = $('<td>').appendTo(row);
                        temp = $('<select>', {class: 'form-control'}).appendTo(temp);
                        if (data[tableIndex].table.group === undefined || !data[tableIndex].table.group.toString().match(/\d{1,}/)) {
                            temp.append('<option selected="true" value>None</option>');
                        } else {
                            temp.append('<option value="">None</option>');
                        }
                        for (i = 0; i <= maxGroup; i += 1) {
                            if (parseFloat(data[tableIndex].table.group) === i) {
                                temp.append('<option selected="true" value="' + i + '">' + i + '</option>');
                            } else {
                                temp.append('<option value="' + i + '">' + i + '</option>');
                            }
                        }
                        temp.change(updateGroup(tableIndex));
                    } else {
                        // console.log('no group', data[tableIndex]);
                        // $('<td>', {text: data[tableIndex]}).appendTo(row);
                        $('<td>', {text: data[tableIndex].table.group}).appendTo(row);
                    }

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

        //this is hear to make sure I never go out of range
        if (tableLength < 1 && tableObject.page > -1) {
            tableObject.page -= 1;
            buildTableBody(tableObject);
        } else if (tableLength && tableObject.page < 0) {
            tableObject.page = 0;
        }

        //add in pagination
        tableObject.pagination.text((tableObject.page + 1) + ' / ' + Math.ceil(goodEntries / max_length));
    };

    //Begin actual work

    var buildIt = function (database_arr, name) {
        var i, tableData, $table, $header, tableObject;

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
        $page.append('<h1>Sample List for level: ' + name + '</h1>');

        if (name === 'name') {
            $page.append('<p>Add samples to groups for reproducibility and comparisons then click the links below to load the different level data in a new window.</p>');
        } else {
            for (i = 0; i < tableObject.data.length; i += 1) {
                // console.log(tableObject.data[i]);
                tableObject.data[i].table.group = tableObject.data[i].origin_db.group;
            }
        }

        $table = $('<table>', {class: 'table'}).appendTo($page);
        $header = $('<thead>').appendTo($table);

        //add in header rows
        addFirstHeaderRow($header, tableObject);
        addSecondHeaderRow($header, tableObject);

        //set up the body to build
        tableObject.element = $('<tbody>').appendTo($table);

        //add in pagination
        tableObject.pagination = createPaginationDivs(tableObject);

        //add in url generated
        tableObject.link_out = $('<div>').appendTo($page);

        tableObject.table_type = name;

        //now actually build the page
        buildTableBody(tableObject);
    };

    //This should work for any data type
    KINOME.list('levels').map(function (lvl) {
        var list = KINOME.get({level: lvl});
        if (list.length) {
            buildIt(list, lvl);
        }
    });

    exports.updateMainTable = buildIt;

}(KINOME));
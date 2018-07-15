/*global M require PROMISE KINOME module google jQuery save $ window*/
(function () {
    'use strict';

    var buildFigures, requires = [require('peptide_picker'), require('bs_toggle-js')];
    require("bs_toggle-css", 'style');

    buildFigures = function ($div, DATA) {
        //console.log(DATA);
        var f_stat, build_columns, pep_picker, color_it, $page_obj = {}, equation, minimums = {linear: {}, kinetic: {}}, retSignal, retBack, getOneDataSet,
                my_state_obj = {}, retSigDBack, retSigMBack, pep_picked, make_reprofigures, buildTooltip,
                thisState, color_it_on = 'linear', currentEQnum = {linear: 2, kinetic: 2}, makeOneChart, uppercase,
                create_data_download_button, get_all_fstats;

        $page_obj.div = $div;
        //defaults
        my_state_obj.linear = {
            param: 0,
            params: DATA[0].linear.equation.mathParams
        };
        my_state_obj.kinetic = {
            param: 0,
            //I have to assume for this that this is consistent across data presented.
            params: DATA[0].kinetic.equation.mathParams
        };

        //Have it when you want it
        pep_picker = KINOME.peptidePicker(DATA);

        $page_obj.width = $('<div>', {class: 'col col-sm-6 col-xs-12'});
        $page_obj.width.appendTo($('<div>', {class: 'row'})
            .appendTo($("<div>", {class: 'container', style: "height:0px;visibility: hidden;"})
                .appendTo('body')));


        retSignal = function (object, type) {
            return object.signal.parameters[my_state_obj[type].param];
        };
        retBack = function (object, type) {
            return object.background.parameters[my_state_obj[type].param];
        };
        retSigDBack = function (object, type) {
            return Math.log(object.signal.parameters[my_state_obj[type].param] /
                    object.background.parameters[my_state_obj[type].param]) / Math.log(2);
        };
        retSigMBack = function (object, type) {
            //this is the hard one...
            var all, i, key2, get_obj, min, allVals = [];
            if (type === 'kinetic') {
                key2 = object.exposure;
                get_obj = {type: type, exposure: object.exposure};
            } else {
                key2 = object.cycle;
                get_obj = {type: type, cycle: object.cycle};
            }
            minimums[type][my_state_obj[type].param] = minimums[type][my_state_obj[type].param] || {};
            if (minimums[type][my_state_obj[type].param][key2] !== undefined) {
                min = minimums[type][my_state_obj[type].param][key2];
            } else {
                all = DATA.get(get_obj);
                // console.log(all);
                for (i = 0; i < all.length; i += 1) {
                    allVals.push(all[i].signal.parameters[my_state_obj[type].param] - all[i].background.parameters[my_state_obj[type].param]);
                }
                allVals = allVals.sort(function (a, b) {
                    return a - b;
                });
                min = allVals[Math.floor(allVals.length / 20) - 1];
                minimums[type][my_state_obj[type].param][key2] = min;
                // console.log(all, get_obj, min);
            }
            if (object.signal.parameters[my_state_obj[type].param] - object.background.parameters[my_state_obj[type].param] < min) {
                return NaN;
            } else {
                return Math.log(object.signal.parameters[my_state_obj[type].param] - object.background.parameters[my_state_obj[type].param] - (min) + 1) / Math.log(2);
            }
        };
        //initialize
        equation = {kinetic: retSigDBack, linear: retSigDBack};

        //peptide picker response
        pep_picked = function (state_object) {
            var pnts = {kinetic: [], linear: []}, j, group, addToPnts;

            // console.log('here', pep_picker);


            addToPnts = function (peptide, thisInd, grp) {
                //get data for all groups
                pnts.kinetic[thisInd] = pnts.kinetic[thisInd] || [];
                pnts.linear[thisInd] = pnts.linear[thisInd] || [];
                pnts.kinetic[thisInd] = pnts.kinetic[thisInd].concat(DATA.get({
                    exposure: state_object.exposure,
                    type: 'kinetic',
                    group: grp,
                    peptide: peptide
                    // get_samples: true
                }));
                pnts.linear[thisInd] = pnts.linear[thisInd].concat(DATA.get({
                    cycle: state_object.cycle,
                    type: 'linear',
                    group: grp,
                    peptide: peptide
                    // get_samples: true
                }));
            };

            thisState = state_object;
            // if (useAllGroups) {
                // $page_obj.selectedGroup.html('Displaying All Groups');
            group = DATA.list('groups');
                // console.log(group);
            // } else {
                // $page_obj.selectedGroup.html('Displaying Group: ' + state_object.sample.group);
                // group = [state_object.sample.group];
            // }

            if (!state_object.peptide) {
                // empty the figures
                $page_obj.kinetic.fig.empty();
                $page_obj.kinetic.f_val.empty();
                $page_obj.linear.fig.empty();
                $page_obj.linear.f_val.empty();
            } else {
                for (j = 0; j < group.length; j += 1) {
                    addToPnts(state_object.peptide, j, group[j]);
                }
            }
            if (pnts.kinetic.length && pnts.linear.length) {
                // console.log(pnts);
                make_reprofigures(pnts, group);
            }
        };

        uppercase = function (str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        };

        buildTooltip = function (x, y, pntx, constant) {
            return '<div style="min-width: 170px; padding:5px;">(Group: ' + x + ', Value:' + y.toFixed(2) + '), ' +
                    '<div>(<a target="_blank" href="' + pntx.lvl_1 + '">' + pntx.name + '</a>, ' +
                    "peptide: " + pntx.peptide + '<br />' +
                    constant + ": " + pntx[constant] + '</div>';
        };

        var retit = function (x) {
            return x;
        };

        getOneDataSet = function (pnts, type, constant, groups) {
            var i, j, x, y, out = [["Group Number"]], oneEx = ["X"],
                    gInd, oneOut, outSimple = [];

            //for total number of groups
            // console.log('these', groups);
            for (i = 0; i < groups.length; i += 1) {
                out[0].push('G' + i);
                out[0].push({type: 'string', role: 'tooltip', p: {html: true}});
                oneEx.push(NaN);
                oneEx.push("");
                outSimple.push([]);
            }

            // console.log('hi', out);

            for (i = 0; i < pnts[type].length; i += 1) { // by group
                for (j = 0; j < pnts[type][i].length; j += 1) { // by sample
                    gInd = pnts[type][i][j].group * 2 + 1;
                    x = pnts[type][i][j].group + (Math.random() * 0.3 - 0.15); // to scatter sideways a bit.
                    y = equation[type](pnts[type][i][j], type);
                    outSimple[pnts[type][i][j].group].push(y);
                    oneOut = oneEx.map(retit);
                    oneOut[0] = x;
                    oneOut[gInd] = y;
                    oneOut[gInd + 1] = buildTooltip(pnts[type][i][j].group, y, pnts[type][i][j], constant);
                    out.push(oneOut);
                }
            }
            // if (pnts[type][0][0]) {
            //     limits_here = limit(pnts[type][0][0][constant], type);
            //     diffPer = 0.05 * (limits_here[1] - limits_here[0]);
            //     out.push([limits_here[0] - diffPer, NaN, "", NaN, "", NaN, "", NaN, "", limits_here[0] - diffPer]);
            //     out.push([limits_here[1] + diffPer, NaN, "", NaN, "", NaN, "", NaN, "", limits_here[1] + diffPer]);
            // }
            return {chart: out, stats: outSimple};
        };

        get_all_fstats = function (state, type) {
            var ii, jj, kk, groups = DATA.list('groups'), tempVal, anova_obj, oneft, peptides, oneANOVA, oneGet, oneGrp, f_tests = [];
            // console.log(pointsList);
            peptides = DATA.list('peptides');
            for (jj = 0; jj < peptides.length; jj += 1) {
                oneANOVA = [];
                anova_obj = {};
                for (ii = 0; ii < groups.length; ii += 1) {
                    oneGet = DATA.get({
                        peptide: peptides[jj],
                        exposure: state.exposure,
                        cycle: state.cycle,
                        type: type,
                        group: groups[ii]
                    });
                    oneGrp = [];
                    anova_obj[ii] = {};
                    for (kk = 0; kk < oneGet.length; kk += 1) {
                        tempVal = equation[type](oneGet[kk], type);
                        anova_obj[ii][oneGet[kk].name] = tempVal;
                        oneGrp.push(tempVal);
                    }
                    oneANOVA.push(oneGrp);

                }
                oneft = f_stat(oneANOVA);
                f_tests.push([peptides[jj], oneft, anova_obj]);
            }
            return f_tests;
        };

        color_it = function (pointsList, state) {
            //console.log('pointsList', pointsList);
            var ii, jj, kk, groups = DATA.list('groups'), oneft, minF = Infinity, maxF = -Infinity, oneANOVA, oneGet, oneGrp, f_tests = [];
            // console.log(pointsList);
            for (jj = 0; jj < pointsList[color_it_on].length; jj += 1) {
                oneANOVA = [];
                for (ii = 0; ii < groups.length; ii += 1) {
                    oneGet = DATA.get({
                        peptide: pointsList[color_it_on][jj].peptide,
                        exposure: state.exposure,
                        cycle: state.cycle,
                        type: color_it_on,
                        group: groups[ii]
                    });
                    oneGrp = [];
                    for (kk = 0; kk < oneGet.length; kk += 1) {
                        oneGrp.push(equation[color_it_on](oneGet[kk], color_it_on));
                    }
                    oneANOVA.push(oneGrp);

                }
                oneft = f_stat(oneANOVA);
                if (!Number.isNaN(oneft)) {
                    minF = Math.min(minF, oneft);
                    maxF = Math.max(maxF, oneft);
                }
                // f_tests.push([oneft, pointsList[color_it_on][jj].peptide]);
                f_tests.push(oneft);
            }

            // console.log('f_tests', f_tests);
            // console.log('oneANOVA', oneANOVA);
            // console.log('oneft', oneft);
            // console.log(JSON.parse(JSON.stringify(f_tests)).sort(function (a, b) {
            //     return b[0] - a[0];
            // }));
            // console.log(pointsList, f_tests, color_it_on, state);
            // console.log(f_tests, 'yeppers');
            return Promise.resolve(f_tests.map(function (t) {
                // t = t[0];
                // console.log(t);
                if (Number.isNaN(t)) {
                    return 0;
                }
                return (t - minF) / (maxF - minF);
            }));
        };

        makeOneChart = function (pnts, type) {
           // console.log('pnts', pnts);
            var dataTable = google.visualization.arrayToDataTable(pnts.chart);
            var options = {
                title: 'Reproducibility - ' + uppercase(type),
                titleTextStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', bold: false, fontSize: '24'},
                hAxis: {title: my_state_obj[type].params[my_state_obj[type].param], titleTextStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '20', bold: false}, textStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '14'}},
                vAxis: {title: my_state_obj[type].params[my_state_obj[type].param], titleTextStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '20', bold: false}, textStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '14'}},
                legend: 'none',
                tooltip: {isHtml: true, trigger: 'both'},
                seriesType: 'scatter',
                // series: {'4': {color: '#e2431e', type: 'line', enableInteractivity: false}},
                height: $page_obj.width.width() * 0.68,
                width: $page_obj.width.width()
            };

            var chart = new google.visualization.ComboChart($page_obj[type].fig[0]);

            google.visualization.events.addListener(chart, 'ready', function () {
                $.each($('text'), function (index, label) {
                    var labelText = $(label).text();
                    if (labelText.match(/_|\^/)) {
                        labelText = labelText.replace(/_([^\{])|_\{([^\}]*)\}/g, '<tspan style="font-size: smaller;" baseline-shift="sub">$1$2</tspan>');
                        labelText = labelText.replace(/\^([^\{])|\^\{([^\}]*)\}/g, '<tspan style="font-size: smaller;" baseline-shift="super">$1$2</tspan>');
                        $(label).html(labelText);
                    }
                    return index; //shut up jslint
                });
            });

            chart.draw(dataTable, options);
            $page_obj[type].f_val.text("f-test = " + f_stat(pnts.stats).toFixed(5));
        };

        make_reprofigures = function (pnts, groups) {
            var xys_lin, xys_kin;

            //get points for kinetic
            xys_kin = getOneDataSet(pnts, 'kinetic', 'exposure', groups);
            // console.log(xys_kin);
            if (xys_kin.chart.length > 1) {
                makeOneChart(xys_kin, 'kinetic');
                /**
                 * Create data download button
                 */
                create_data_download_button($page_obj.kinetic.download_data, 'kinetic', get_all_fstats, thisState);
            }

            //get points for linear
            xys_lin = getOneDataSet(pnts, 'linear', 'cycle', groups);
            if (xys_lin.chart.length > 1) {
                makeOneChart(xys_lin, 'linear');
                /**
                 * Create data download button
                 */
                create_data_download_button($page_obj.linear.download_data, 'linear', get_all_fstats, thisState);
            }

            return;
        };

        //F-test or ANOVA body
        f_stat = (function () {
            var add = function (a, b) {
                return a + b;
            };
            var mean = function (arr) {
                return arr.reduce(add) / arr.length;
            };
            var sse = function (arr, avg) {
                var i, sum = 0;
                avg = avg || mean(arr);
                for (i = 0; i < arr.length; i += 1) {
                    sum += Math.pow(arr[i] - avg, 2);
                }
                return sum;
            };
            var concatArrs = function (a, b) {
                return a.concat(b);
            };
            return function (arrs) {
                var newArr = [], i, totalSampleSize = 0, bgv = 0, wgv = 0, indMean, overallMean = mean(arrs.reduce(concatArrs));
                // Get rid of empty array spots (special for for this module)
                for (i = 0; i < arrs.length; i += 1) {
                    if (arrs[i].length > 1) {
                        newArr.push(arrs[i]);
                    }
                }
                arrs = newArr;
                if (arrs.length < 2 || arrs[0].length < 2 || arrs[1].length < 2) {
                    return NaN;
                }
                for (i = 0; i < arrs.length; i += 1) {
                    indMean = mean(arrs[i]);
                    bgv += arrs[i].length * Math.pow(indMean - overallMean, 2);
                    wgv += sse(arrs[i], indMean);
                    totalSampleSize += arrs[i].length;
                }

                bgv /= (arrs.length - 1);
                wgv /= (totalSampleSize - arrs.length);

                return bgv / wgv;
            };
        }());



        /*                          //
            Create page components  //
        */                          //

        /*
            Titles
        */

        //Title
        $page_obj.title = $('<h1 style="page-header">Parameter ANOVA</h1>');

        //Peptide Picker

        //Group heading
        // $page_obj.groupHeading = $('<div>');
        // $page_obj.selectedGroup = $('<h2>', {class: 'page-header'});
        // $page_obj.allTog = $('<input type="checkbox" data-on="All Groups" data-off="One Group" data-width="125" data-toggle="toggle">');
        // $page_obj.groupHeading
        //     .append($page_obj.selectedGroup)
        //     .append($page_obj.allTog);
        //activate toggle
        // $page_obj.allTog.bootstrapToggle().change(function () {
        //     useAllGroups = $(this).prop('checked');
        //     pep_picked(thisState);
        // });

        /*
            Figures for each side
        */
        $page_obj.figures = $('<div>', {class: 'row'});
        $page_obj.linear = {};
        $page_obj.kinetic = {};
        $page_obj.buttons = [];

        //Now build each side
        build_columns = function (type) {
            var part = $page_obj[type], i, btn;

            part.col = $('<div>', {class: 'col col-xs-12 col-sm-6'});
            part.title = $('<div>');
            part.title.append($('<h3>' + uppercase(type) + ' Options</h3>'));
            btn = $('<button>', {text: 'Color By', class: 'btn btn-default'}).click(function () {
                $page_obj.buttons.map(function (x) {
                    x.removeClass('active');
                });
                $page_obj.buttons.map(function (x) {
                    x.text('Color By');
                });
                $(this).addClass('active');
                $(this).text('Colored By');
                color_it_on = type;
                pep_picker.setColorFunc(color_it);
                // console.log(color_it_on);
            });
            part.title.append(btn);
            $page_obj.buttons.push(btn);


            //equation displays
            part.equationTitle = $('<h4>Model Parameterized</h4>');
            part.equation = $('<div>', {
                style: "min-height: 40px;display: table;"
            }).append($('<div>', {
                style: 'display: table-cell;vertical-align:middle;'
            }).append(
                M.sToMathE(DATA[0][type].equation.mathType)
            ));

            //parameter picker
            part.parameterTitle = $('<h4>Parameter Viewing</h4>');
            part.parameterPicker = $('<select>', {style: 'vertical-align: middle', class: 'form-control'});
            //Background Correction
            part.backCorrTitle = $('<h4>Background Correction</h4>');
            part.backCorrPicker = $('<select>', {style: 'vertical-align: middle', class: 'form-control'});
            part.backCorrSelected = $('<div>', {style: 'margin-top:15px;', class: 'text-center'});
            //Finally the figures themselves
            part.fig = $('<div>');
            part.download_data = $('<div>', {style: 'padding: 20px'});
            //And the place for correlation
            part.f_val = $('<p>', {class: "text-center lead"});

            //add in all the parts in order
            part.col
                .append(part.title)
                .append(part.equationTitle)
                .append(part.equation)
                .append(part.parameterTitle)
                .append(part.parameterPicker)
                .append(part.backCorrTitle)
                .append(part.backCorrPicker)
                .append(part.backCorrSelected)
                .append(part.fig)
                .append(part.f_val)
                .append(part.download_data);

            //Add in the menu options for the parameter
            for (i = 0; i < my_state_obj[type].params.length; i += 1) {
                part.parameterPicker.append(
                    '<option value="' + i + '">' +
                    my_state_obj[type].params[i] + "</option>"
                );
            }
            part.parameterPicker.change(function (evt) {
                var selected = evt.target.value;
                my_state_obj[type].param = selected;
                pep_picked(thisState);
            });

            //Now add in menu options for the correction picker
            part.backCorrPicker.append(
                '<option value="0">Signal</option>' +
                '<option value="1">Background</option>' +
                '<option selected value="2">log_2(s/b)</option>' +
                '<option value="3">log_2(100(s - b + c_e))</option>'
            ).change(function (evt) {
                var selected = evt.target.value, key2, ce;
                currentEQnum[type] = selected;
                switch (selected) {
                case "0":
                    part.backCorrSelected.html('signal');
                    equation[type] = retSignal;
                    break;
                case "1":
                    part.backCorrSelected.html('background');
                    equation[type] = retBack;
                    break;
                case "2":
                    part.backCorrSelected.html(M.sToMathE("log_2({signal}/{background})"));
                    equation[type] = retSigDBack;
                    break;
                case "3":
                    part.backCorrSelected.html(M.sToMathE("log_2{100(signal-background+c_e)}"));
                    equation[type] = retSigMBack;
                    break;
                }
                pep_picked(thisState);
                if (selected === "3") {
                    key2 = type === 'kinetic'
                        ? thisState.exposure
                        : thisState.cycle;
                    ce = 1 - minimums[type][my_state_obj[type].param][key2];
                    // console.log(ce);
                    part.backCorrSelected.append(",&nbsp;&nbsp;").append(
                        M.sToMathE("c_e=" + ce.toFixed(4))
                    );
                }
            });

            //default for equation viewed
            part.backCorrSelected.html(M.sToMathE("log_2({signal}/{background})"));
        };

        create_data_download_button = function (div, type, get_data, state) {
            var download_button;

            div.empty();

            download_button = $('<button>', {class: 'btn btn-default btn-large center-block'}).on('click', function () {
                var data = get_data(state, type), key, now, ii, jj, kk, groupList, sampleList, strArr = [];

                groupList = Object.keys(data[0][2]);
                sampleList = [];
                for (jj = 0; jj < groupList.length; jj += 1) {
                    sampleList[jj] = Object.keys(data[0][2][groupList[jj]]);
                }

                // make header
                strArr.push(["Peptide", "F-statistic"]);
                for (jj = 0; jj < groupList.length; jj += 1) {
                    for (kk = 0; kk < sampleList[jj].length; kk += 1) {
                        strArr[0].push("Group " + groupList[jj] + ": " + sampleList[jj][kk]);
                    }
                }
                strArr[0] = strArr[0].join('\t');

                //make body
                //console.log(data, sampleList, groupList);
                for (ii = 0; ii < data.length; ii += 1) {
                    strArr[ii + 1] = [data[ii][0], data[ii][1]];
                    for (jj = 0; jj < groupList.length; jj += 1) {
                        for (kk = 0; kk < sampleList[jj].length; kk += 1) {
                            strArr[ii + 1].push(data[ii][2][groupList[jj]][sampleList[jj][kk]]);
                        }
                    }
                    strArr[ii + 1] = strArr[ii + 1].join('\t');
                }
                //console.log(strArr);
                key = type === "linear"
                    ? state.exposure + 'ms'
                    : 'cycle_' + state.cycle;

                now = new Date();

                save(strArr.join("\n"), 'f_stats_' + type + "_" + key + "_" + now.toLocaleDateString().replace(/[^\w\d]+/g, "_") + "_" + now.toLocaleTimeString().replace(/[^\w\d]+/g, "_") + '.txt');

            });
            download_button.html('Download All ' + uppercase(type) + ' Data and F-statistics');

            div.append(download_button);

            return div;
        };

        /**
         * Pulls from the data used to generate the graph
         * Original data format heavily dependent on the type of data
         */
        // format_anova_data = function (data, type) {
        //     var formatted_data, i;

        //     for (i = 0; i < data.length; i += 1) {
        //         for (j = 0; )
        //     }
            
        // }

        build_columns('linear');
        build_columns('kinetic');
        $page_obj.buttons[0].click();
        $page_obj.figures
            .append($page_obj.linear.col)
            .append($page_obj.kinetic.col);


        //add parts to the div
        $page_obj.div
            .append($page_obj.title)
            .append(pep_picker.div)
            // .append($page_obj.groupHeading)
            .append($page_obj.figures);
        pep_picker.change(pep_picked);
        pep_picker.setColorFunc(color_it);
        pep_picker.disableSample();

        //finally add on resize function, this makes sure that the figures
        // remain the correct size.
        var waitForFinalEvent = (function () {
            var timers = {};
            return function (callback, ms, uniqueId) {
                if (!uniqueId) {
                    uniqueId = "Don't call this twice without a uniqueId";
                }

                if (timers[uniqueId]) {
                    clearTimeout(timers[uniqueId]);
                }
                timers[uniqueId] = setTimeout(callback, ms);
            };
        }());
        window.addEventListener("resize", function () {
            waitForFinalEvent(function () {
                pep_picked(thisState);
            }, 500, "resize_reproduce");
        });

    };

    //get stuff building
    (function () {
        var $div = KINOME.addAnalysis('ANOVA');
        Promise.all(requires).then(function () {
            buildFigures($div, KINOME.get({level: '^2'}));
        });
    }());
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : window
));
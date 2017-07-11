/*global M require KINOME module google jQuery save $ window*/
(function () {
    'use strict';

    var buildFigures, pearsonCorr, requires = [require('peptide_picker'), require('bs_toggle-js')];
    require("bs_toggle-css", 'style');

    buildFigures = function ($div, DATA) {
        var peps, build_columns, $page_obj = {}, equation, minimums = {linear: {}, kinetic: {}}, retSignal, retBack, getOneDataSet, pep_picker,
                my_state_obj = {}, retSigDBack, retSigMBack, pep_picked, make_reprofigures, limit, useAllGroups = false, buildTooltip,
                thisState, limits = {linear: {}, kinetic: {}}, currentEQnum = {linear: 2, kinetic: 2}, makeOneChart, uppercase, collapse;

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

        $page_obj.width = $('<div>', {class: 'col col-sm-6 col-xs-12'});
        $page_obj.width.appendTo($('<div>', {class: 'row'})
            .appendTo($("<div>", {class: 'container', style: "height:0px;visibility: hidden;"})
                .appendTo('body')));
        //get peptide list for later use
        peps = DATA.list('peptides');

        retSignal = function (object, type) {
            return object.signal.parameters[my_state_obj[type].param];
        };
        retBack = function (object, type) {
            return object.background.parameters[my_state_obj[type].param];
        };
        retSigDBack = function (object, type) {
            return Math.log(
                object.signal.parameters[my_state_obj[type].param] /
                object.background.parameters[my_state_obj[type].param]
            ) / Math.log(2);
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

            // console.log(state_object);
            var pnts = {kinetic: [], linear: []}, i, j, group, addToPnts;


            addToPnts = function (group, peptide) {
                pnts.kinetic.push(DATA.get({
                    exposure: state_object.exposure,
                    type: 'kinetic',
                    group: group,
                    peptide: peptide
                }));
                pnts.linear.push(DATA.get({
                    cycle: state_object.cycle,
                    type: 'linear',
                    group: group,
                    peptide: peptide
                }));
            };

            thisState = state_object;
            if (useAllGroups) {
                $page_obj.selectedGroup.html('Displaying All Groups');
                group = DATA.list('groups');
                // console.log(group);
            } else {
                $page_obj.selectedGroup.html('Displaying Group: ' + state_object.sample.group);
                group = [state_object.sample.group];
            }

            if (!state_object.peptide) {
                for (i = 0; i < peps.length; i += 1) {
                    for (j = 0; j < group.length; j += 1) {
                        addToPnts(group[j], peps[i]);
                    }
                }
            } else {
                for (j = 0; j < group.length; j += 1) {
                    addToPnts(group[j], state_object.peptide);
                }
            }
            if (pnts.kinetic.length && pnts.linear.length) {
                make_reprofigures(pnts, DATA.list('groups'));
            }
        };

        uppercase = function (str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        };

        buildTooltip = function (x, y, pntx, pnty, constant) {
            return '<div style="min-width: 170px; padding:5px;">(' + x.toFixed(2) + ', ' + y.toFixed(2) + '), ' +
                    '<div>(<a target="_blank" href="' + pntx.lvl_1 + '">' + pntx.name + '</a>, ' +
                    '<a target="_blank" href="' + pnty.lvl_1 + '">' + pnty.name + '</a>)</div>' +
                    "group: " + pnty.group + ', <br />' +
                    "peptide: " + pnty.peptide + '<br />' +
                    constant + ": " + pnty[constant] + '</div>';
        };
        var retit = function (x) {
            return x;
        };

        getOneDataSet = function (pnts, type, constant, groups) {
            var i, j, k, x, y, out = [["X"]],
                    limits_here, diffPer, gInd, oneOut, oneEx = ['X'];
            for (i = 0; i < groups.length; i += 1) {
                out[0].push('G' + i);
                out[0].push({type: 'string', role: 'tooltip', p: {html: true}});
                oneEx.push(NaN);
                oneEx.push("");
            }
            oneEx.push(NaN);//one to one
            out[0].push('one to one');
            for (i = 0; i < pnts[type].length; i += 1) {
                for (j = 0; j < pnts[type][i].length; j += 1) {
                    for (k = 0; k < pnts[type][i].length; k += 1) {
                        if (j !== k) {
                            gInd = pnts[type][i][k].group * 2 + 1;
                            x = equation[type](pnts[type][i][j], type);
                            y = equation[type](pnts[type][i][k], type);
                            oneOut = oneEx.map(retit);
                            oneOut[0] = x;
                            oneOut[gInd] = y;
                            oneOut[gInd + 1] = buildTooltip(x, y, pnts[type][i][j], pnts[type][i][k], constant);
                            out.push(oneOut);
                        }
                    }
                }
            }
            if (pnts[type][0][0]) {
                limits_here = limit(pnts[type][0][0][constant], type);
                diffPer = 0.05 * (limits_here[1] - limits_here[0]);

                // bottom left
                oneOut = oneEx.map(retit);
                oneOut[0] = limits_here[0] - diffPer;
                oneOut[oneOut.length - 1] = limits_here[0] - diffPer;
                out.push(oneOut);

                // top right
                oneOut = oneEx.map(retit);
                oneOut[0] = limits_here[1] + diffPer;
                oneOut[oneOut.length - 1] = limits_here[1] + diffPer;
                out.push(oneOut);
            }

            // console.log(out, oneOut, oneEx);
            return out;
        };

        makeOneChart = function (pnts, type, lineInd) {
            var dataTable = google.visualization.arrayToDataTable(pnts), theSeries = {};
            theSeries[lineInd.toString()] = {color: '#e2431e', type: 'line', enableInteractivity: false};
            var options = {
                title: 'Reproducibility - ' + uppercase(type),
                titleTextStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', bold: false, fontSize: '24'},
                hAxis: {title: my_state_obj[type].params[my_state_obj[type].param], titleTextStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '20', bold: false}, textStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '14'}},
                vAxis: {title: my_state_obj[type].params[my_state_obj[type].param], titleTextStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '20', bold: false}, textStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '14'}},
                legend: 'none',
                tooltip: {isHtml: true, trigger: 'both'},
                seriesType: 'scatter',
                series: theSeries,
                height: $page_obj.width.width(),
                width: $page_obj.width.width()
            };

            var chart = new google.visualization.ComboChart($page_obj[type].fig[0]);

            google.visualization.events.addListener(chart, 'ready', function () {
                $.each($('text'), function (index, label) {
                    var labelText = $(label).text();
                    if (labelText.match(/_|\^/)) {
                        labelText = labelText.replace(/_([^{])|_\{([^}]*)\}/g, '<tspan style="font-size: smaller;" baseline-shift="sub">$1$2</tspan>');
                        labelText = labelText.replace(/\^([^{])|\^\{([^}]*)\}/g, '<tspan style="font-size: smaller;" baseline-shift="super">$1$2</tspan>');
                        $(label).html(labelText);
                    }
                    return index; //shut up jslint
                });
            });

            chart.draw(dataTable, options);

            $page_obj[type].corr.text("pearson's r = " + pearsonCorr(collapse(pnts)).toFixed(5));
        };

        collapse = function (arr) {
            var i, j, arrOut = [];
            for (i = 0; i < arr.length; i += 1) {
                arrOut[i] = [];
                for (j = 0; j < arr[i].length && arrOut[i].length < 2; j += 1) {
                    if (typeof arr[i][j] === 'number' && !Number.isNaN(arr[i][j])) {
                        arrOut[i].push(arr[i][j]);
                    }
                }
            }
            arrOut.shift(); // leave out header
            return arrOut;
        };

        make_reprofigures = function (pnts, groups) {
            var xys_lin, xys_kin;

            //get points for kinetic
            xys_kin = getOneDataSet(pnts, 'kinetic', 'exposure', groups);
            if (xys_kin.length > 1) {
                makeOneChart(xys_kin, 'kinetic', groups.length);
            }

            //get points for linear
            xys_lin = getOneDataSet(pnts, 'linear', 'cycle', groups);
            if (xys_lin.length > 1) {
                makeOneChart(xys_lin, 'linear', groups.length);
            }

            return;
        };

        limit = function (param2, type) {
            var get_obj, all;
            if (type === 'kinetic') {
                get_obj = {
                    type: type,
                    exposure: param2
                };
            } else {
                get_obj = {
                    type: type,
                    cycle: param2
                };
            }
            limits[type] = limits[type] || {};
            limits[type][currentEQnum[type]] = limits[type][currentEQnum[type]] || {};
            limits[type][currentEQnum[type]][my_state_obj[type].param] = limits[type][currentEQnum[type]][my_state_obj[type].param] || {};
            if (limits[type][currentEQnum[type]][my_state_obj[type].param][param2] !== undefined) {
                return limits[type][currentEQnum[type]][my_state_obj[type].param][param2];
            }
            all = DATA.get(get_obj).map(function (x) {
                return equation[type](x, type);
            }).sort(function (a, b) {
                return a - b;
            });
            // console.log(all);

            //get rid of really extreme values
            while (Math.abs(all[0]) > 100 * Math.abs(all[1])) {
                all.shift();
            }
            while (Math.abs(all[all.length - 1]) > 100 * Math.abs(all[all.length - 2])) {
                all.pop();
            }
            // console.log(all);
            limits[type][currentEQnum[type]][my_state_obj[type].param][param2] = [all[0], all[all.length - 1]];
            return limits[type][currentEQnum[type]][my_state_obj[type].param][param2];
        };


        /*                          //
            Create page components  //
        */                          //

        /*
            Titles
        */

        //Title
        $page_obj.title = $('<h1 style="page-header">Parameter Reproducibility</h1>');

        //Peptide Picker

        //Group heading
        $page_obj.groupHeading = $('<div>');
        $page_obj.selectedGroup = $('<h2>', {class: 'page-header'});
        $page_obj.allTog = $('<input type="checkbox" data-on="All Groups" data-off="One Group" data-width="125" data-toggle="toggle">');
        $page_obj.groupHeading
            .append($page_obj.selectedGroup)
            .append($page_obj.allTog);
        //activate toggle
        $page_obj.allTog.bootstrapToggle().change(function () {
            useAllGroups = $(this).prop('checked');
            pep_picked(thisState);
        });

        /*
            Figures for each side
        */
        $page_obj.figures = $('<div>', {class: 'row'});
        $page_obj.linear = {};
        $page_obj.kinetic = {};


        //Now build each side
        build_columns = function (type) {
            var part = $page_obj[type], i;

            part.col = $('<div>', {class: 'col col-xs-12 col-sm-6'});
            part.title = $('<h3>' + uppercase(type) + ' Options</h3>');
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
            //And the place for correlation
            part.corr = $('<p>', {class: "text-center lead"});

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
                .append(part.corr);

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

        build_columns('linear');
        build_columns('kinetic');
        $page_obj.figures
            .append($page_obj.linear.col)
            .append($page_obj.kinetic.col);


        //add parts to the div
        pep_picker = KINOME.peptidePicker(DATA);
        $page_obj.div
            .append($page_obj.title)
            .append(pep_picker.div)
            .append($page_obj.groupHeading)
            .append($page_obj.figures);

        setTimeout(function () {
            pep_picker.change(pep_picked);
        }, 2000);


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

    pearsonCorr = (function () {
        var add2, sqr2, cross, add;
        add2 = function (a, b) {
            return [a[0] + b[0], a[1] + b[1]];
        };
        sqr2 = function (x) {
            return [x[0] * x[0], x[1] * x[1]];
        };
        cross = function (x) {
            return x[0] * x[1];
        };
        add = function (a, b) {
            return a + b;
        };
        return function (dataIn) {
            var i = 0, data = [];
            //remove all bad points
            for (i = 0; i < dataIn.length; i += 1) {
                dataIn[i][0] = parseFloat(dataIn[i][0]);
                dataIn[i][1] = parseFloat(dataIn[i][1]);
                if (
                    typeof dataIn[i][0] === 'number' && !Number.isNaN(dataIn[i][0]) &&
                    typeof dataIn[i][1] === 'number' && !Number.isNaN(dataIn[i][1]) &&
                    isFinite(dataIn[i][0]) && isFinite(dataIn[i][1])
                ) {
                    data.push([dataIn[i][0], dataIn[i][1]]);
                }
            }
            if (!data.length) {
                return 0;
            }
            var sums = data.reduce(add2);
            var sqrSums = data.map(sqr2).reduce(add2);
            var pSum = data.map(cross).reduce(add);
            var n = data.length;

            var num = pSum - (sums[0] * sums[1] / n);
            var den = Math.sqrt(
                (sqrSums[0] - sums[0] * sums[0] / n) *
                (sqrSums[1] - sums[1] * sums[1] / n)
            );

            if (den === 0) {
                return 0;
            }

            return num / den;
        };
    }());

    //get stuff building
    (function () {
        var $div = KINOME.addAnalysis('Reproducibility');
        Promise.all(requires).then(function () {
            buildFigures($div, KINOME.get({level: '^2'}));
        });
    }());
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : window
));
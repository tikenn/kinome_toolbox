/*global M require KINOME module google jQuery save $ window*/
(function () {
    'use strict';

    var buildFigures, pearsonCorr, requires = [require('peptide_picker'), require('bs-toggle')];
    require("https://gitcdn.github.io/bootstrap-toggle/2.2.2/css/bootstrap-toggle.min.css", 'style', false);

    buildFigures = function ($div, DATA) {
        var peps, $page_obj = {}, equation, minimums = {linear: {}, kinetic: {}}, retSignal, retBack,
                retSigDBack, retSigMBack, pep_picked, make_reprofigures, limit, useAllGroups = false,
                thisState, limits = {linear: [{}, {}, {}, {}], kinetic: [{}, {}, {}, {}]}, currentEQnum;

        $page_obj.div = $div;
        $page_obj.width = $('<div>', {class: 'col col-sm-6 col-xs-12'});
        $page_obj.width.appendTo($('<div>', {class: 'row'})
            .appendTo($("<div>", {class: 'container', style: "height:0px;visibility: hidden;"})
                .appendTo('body')));
        //get peptide list for later use
        peps = DATA.list('peptides');
        currentEQnum = "2";

        retSignal = function (object) {
            return object.signal.parameters[0];
        };
        retBack = function (object) {
            return object.background.parameters[0];
        };
        retSigDBack = function (object) {
            return Math.log(object.signal.parameters[0] /
                    object.background.parameters[0]) / Math.log(2);
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
            if (minimums[type][key2] !== undefined) {
                min = minimums[type][key2];
            } else {
                all = DATA.get(get_obj);
                // console.log(all);
                for (i = 0; i < all.length; i += 1) {
                    allVals.push(all[i].signal.parameters[0] - all[i].background.parameters[0]);
                }
                allVals = allVals.sort(function (a, b) {
                    return a - b;
                });
                min = allVals[Math.floor(allVals.length / 20) - 1];
                minimums[type][key2] = min;
                // console.log(all, get_obj, min);
            }
            if (object.signal.parameters[0] - object.background.parameters[0] < min) {
                return NaN;
            } else {
                return Math.log(object.signal.parameters[0] - object.background.parameters[0] - (min) + 1) / Math.log(2);
            }
        };
        //initialize
        equation = retSigDBack;

        //peptide picker response
        pep_picked = function (state_object) {
            var pnts = {kin: [], lin: []}, i, j, group, addToPnts;


            addToPnts = function (group, peptide) {
                pnts.kin.push(DATA.get({
                    exposure: state_object.exposure,
                    type: 'kinetic',
                    group: group,
                    peptide: peptide
                }));
                pnts.lin.push(DATA.get({
                    cycle: state_object.cycle,
                    type: 'linear',
                    group: group,
                    peptide: peptide
                }));
            };

            thisState = state_object;
            if (useAllGroups) {
                $page_obj.selectedGroup.html('All Groups');
                group = DATA.list('groups');
                // console.log(group);
            } else {
                $page_obj.selectedGroup.html('Group ' + state_object.sample.group);
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
            if (pnts.kin.length && pnts.lin.length) {
                make_reprofigures(pnts);
            }
        };

        make_reprofigures = function (pnts) {
            var i, j, k, x, y, limits_here, diffPer, xys_lin = [['x', 'y', {type: 'string', role: 'tooltip'}, 'onetoone', {type: 'string', role: 'tooltip'}]],
                    xys_kin = [['x', 'y', {type: 'string', role: 'tooltip'}, 'onetoone', {type: 'string', role: 'tooltip'}]];
            //get points for kinetic
            for (i = 0; i < pnts.kin.length; i += 1) {
                for (j = 0; j < pnts.kin[i].length; j += 1) {
                    for (k = 0; k < pnts.kin[i].length; k += 1) {
                        if (j !== k) {
                            x = equation(pnts.kin[i][j], 'kinetic');
                            y = equation(pnts.kin[i][k], 'kinetic');
                            xys_kin.push([
                                x,
                                y,
                                "x: val: " + x.toFixed(2) +
                                        " R2: " + pnts.kin[i][j].signal.R2.toFixed(2) + '\n' +
                                        " y: val: " + y.toFixed(2) +
                                        " R2: " + pnts.kin[i][k].signal.R2.toFixed(2) + '\n' +
                                        "peptide: " + pnts.kin[i][k].peptide + '\n' +
                                        "exposure: " + pnts.kin[i][k].exposure,
                                null,
                                ""
                            ]);
                        }
                    }
                }
            }

            if (pnts.kin[0][0]) {
                limits_here = limit(pnts.kin[0][0].exposure, 'kinetic');
                diffPer = 0.05 * (limits_here[1] - limits_here[0]);
                xys_kin.push([limits_here[0] - diffPer, null, "", limits_here[0] - diffPer, "one-to-one line"]);
                xys_kin.push([limits_here[1] + diffPer, null, "", limits_here[1] + diffPer, "one-to-one line"]);
            }

            var dataTable = google.visualization.arrayToDataTable(xys_kin);
            var options = {
                title: 'Reproducibility - Kinetic',
                hAxis: {title: 'v_i 1'},
                vAxis: {title: 'v_i 2'},
                legend: 'none',
                seriesType: 'scatter',
                series: {'1': {type: 'line'}},
                height: $page_obj.width.width(),
                width: $page_obj.width.width()
            };

            var chart = new google.visualization.ComboChart($page_obj.kinetic[0]);

            chart.draw(dataTable, options);
            $page_obj.kinetic_corr.text("pearson's r = " + pearsonCorr(xys_kin).toFixed(5));


            //get points for linear
            for (i = 0; i < pnts.lin.length; i += 1) {
                for (j = 0; j < pnts.lin[i].length; j += 1) {
                    for (k = 0; k < pnts.lin[i].length; k += 1) {
                        if (j !== k) {
                            x = equation(pnts.lin[i][j], 'linear');
                            y = equation(pnts.lin[i][k], 'linear');
                            xys_lin.push([
                                x,
                                y,
                                "x: val: " + x.toFixed(2), //+
                                        " R2: " + pnts.lin[i][j].signal.R2.toFixed(2) + '\n' +
                                        " y: val: " + y.toFixed(2) +
                                        " R2: " + pnts.lin[i][k].signal.R2.toFixed(2) + '\n' +
                                        "peptide: " + pnts.lin[i][k].peptide + '\n' +
                                        "exposure: " + pnts.lin[i][k].exposure
                                null,
                                ""
                            ]);
                        }
                    }
                }
            }
            // console.log(xys_lin);
            if (pnts.lin[0][0]) {
                limits_here = limit(pnts.lin[0][0].cycle, 'linear');
                diffPer = 0.05 * (limits_here[1] - limits_here[0]);
                xys_lin.push([limits_here[0] - diffPer, null, "", limits_here[0] - diffPer, "one-to-one line"]);
                xys_lin.push([limits_here[1] + diffPer, null, "", limits_here[1] + diffPer, "one-to-one line"]);
            }

            dataTable = google.visualization.arrayToDataTable(xys_lin);
            options = {
                title: 'Reproducibility - Linear',
                hAxis: {title: 'm 1'},
                vAxis: {title: 'm 2'},
                legend: 'none',
                seriesType: 'scatter',
                series: {'1': {type: 'line'}},
                height: $page_obj.width.width(),
                width: $page_obj.width.width()
            };

            chart = new google.visualization.ComboChart($page_obj.linear[0]);

            chart.draw(dataTable, options);
            $page_obj.linear_corr.text("pearson's r = " + pearsonCorr(xys_lin).toFixed(5));

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
            if (limits[type][currentEQnum][param2] !== undefined) {
                return limits[type][currentEQnum][param2];
            }
            all = DATA.get(get_obj).map(function (x) {
                return equation(x, type);
            }).sort(function (a, b) {
                return a - b;
            });
            // console.log(all);

            limits[type][currentEQnum][param2] = [all[0], all[all.length - 1]];
            return limits[type][currentEQnum][param2];
        };


        //Create page components
        $page_obj.figures = $('<div>', {class: 'row'});
        $page_obj.linear = $('<div>', {class: 'col col-xs-12 col-sm-6'}).appendTo($page_obj.figures);
        $page_obj.kinetic = $('<div>', {class: 'col col-xs-12 col-sm-6'}).appendTo($page_obj.figures);


        $page_obj.allTog = $('<input type="checkbox" data-toggle="toggle">');
        $page_obj.selectedGroup = $('<h3>', {style: 'display: inline; margin-right:15px;'});
        $page_obj.figureHeaders = $('<div>', {class: 'col col-xs-12'}).append($page_obj.selectedGroup).append('<h3 style="display: inline;margin-right:15px;">Use All:</h3>').append($page_obj.allTog);
        $page_obj.selectedEquation = $('<div>', {style: 'vertical-align: middle; overflow-wrap: break-word;', class: 'col col-sm-4 col-xs-6', html: M.sToMathE("log_2({signal}/{background})")});
        $page_obj.selectEquation = $('<select>', {style: 'vertical-align: middle', class: 'form-control'}).append(
            '<option value="0">Signal</option>' +
            '<option value="1">Background</option>' +
            '<option selected value="2">log_2(s/b)</option>' +
            '<option value="3">log_2(100(s - b + c_e))</option>'
        ).change(function (evt) {
            var selected = evt.target.value;
            evt.preventDefault();
            if (selected === "0") {
                $page_obj.selectedEquation.html('signal');
                currentEQnum = "0";
                equation = retSignal;
            } else if (selected === "1") {
                $page_obj.selectedEquation.html('background');
                currentEQnum = "1";
                equation = retBack;
            } else if (selected === "2") {
                $page_obj.selectedEquation.html(M.sToMathE("log_2({signal}/{background})"));
                currentEQnum = "2";
                equation = retSigDBack;
            } else {
                currentEQnum = "3";
                $page_obj.selectedEquation.html(M.sToMathE("log_2{100(sig-back+c_e)}"));
                equation = retSigMBack;
            }
            pep_picked(thisState);
        });

        // $().appendTo('body')

        $page_obj.equationState = $('<div>', {class: 'row'})
            .append($page_obj.figureHeaders)
            .append($('<div class="col-sm-4 col-xs-6"></div>')
                .append($page_obj.selectEquation))
            .append($page_obj.selectedEquation);

        //for some reason, this has to be done here...
        $page_obj.allTog.bootstrapToggle().change(function () {
            useAllGroups = $(this).prop('checked');
            pep_picked(thisState);
        });

        $page_obj.linear.append('<h3>Linear Fits</h3>');
        $page_obj.kinetic.append('<h3>Kinetic Fits</h3>');
        $page_obj.linear = $('<div>').appendTo($page_obj.linear);
        $page_obj.kinetic = $('<div>').appendTo($page_obj.kinetic);
        $page_obj.linear_corr = $('<p>', {class: "text-center lead"}).insertAfter($page_obj.linear);
        $page_obj.kinetic_corr = $('<p>', {class: "text-center lead"}).insertAfter($page_obj.kinetic);
        $page_obj.pep_picker = KINOME.peptidePicker(DATA, '', pep_picked);

        //add parts to the div
        $page_obj.div.append($page_obj.pep_picker).append($page_obj.equationState).append($page_obj.figures);
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
                    typeof dataIn[i][0] === 'number' && !isNaN(dataIn[i][0]) &&
                    typeof dataIn[i][1] === 'number' && !isNaN(dataIn[i][1])
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
            var den = Math.sqrt((sqrSums[0] - sums[0] * sums[0] / n) *
                    (sqrSums[1] - sums[1] * sums[1] / n));

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
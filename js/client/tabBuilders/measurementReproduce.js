/*global KINOME $ google*/
(function (exports) {
    'use strict';

    var pearsonCorr, allSamples = false, lastState, spearmanCorr, buildPage, getData, changResp, makeFigure, DATA, $page = {},
            requires = [require('img-picker'), require('equation-picker')];

    buildPage = function (div, data) {
        var imgPicker = KINOME.imagePicker(data);
        var eqPicker = KINOME.equationPicker(data, imgPicker);

        //only going to use imgPicker for sample and exposure
        imgPicker.disableCycle();

        DATA = data;


        //set up elements
        $page.figures = $('<div>', {class: 'row'});
        $page.kinetic = {};
        $page.kinetic.picker = $('<div>', {class: 'col col-sm-6 col-xs-12'});
        $page.kinetic.figure = $('<div>', {class: 'col col-sm-6 col-xs-12'});
        $page.correlation = $('<p>', {style: 'margin-top: 10px;', class: "text-center lead"});
        $page.figures.append($page.kinetic.picker)
            .append($page.kinetic.figure);

        //Add in a toggle
        $page.allTog = $('<input type="checkbox" data-on="All Samples" data-off="One Sample" data-width="125" data-toggle="toggle">');
        $page.kinetic.picker
            .append('<div height="15px;">&nbsp;</div>') //could not add margin for some reason...
            .append($page.allTog)
            .append(eqPicker.col.kinetic)
            .append($page.correlation);
        //activate toggle
        $page.allTog.bootstrapToggle().change(function () {
            allSamples = $(this).prop('checked');
            changResp(lastState);
        });

        //put them all together
        div.append(imgPicker.div)
            .append($page.figures);

        //make dummy div
        $page.width = $('<div>', {class: 'col col-sm-6 col-xs-12'});
        $page.width.appendTo($('<div>', {class: 'row'})
            .appendTo($("<div>", {class: 'container', style: "height:0px;visibility: hidden;"})
                .appendTo('body')));


        eqPicker.change(changResp);
    };

    changResp = function (state_change) {
        lastState = state_change;
        makeFigure(state_change, 'kinetic', 'exposure');
    };

    makeFigure = function (state_change, type, constant) {
        var data = getData(state_change, type, constant);
        // console.log(state_change, type, constant)
        var dataTable = google.visualization.arrayToDataTable(data);
        var options = {
            title: 'Measurement Reproducibility',
            titleTextStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', bold: false, fontSize: '24'},
            hAxis: {title: "Cycle Series " + state_change.eq.kinetic.parameter, titleTextStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '20', bold: false}, textStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '14'}},
            vAxis: {title: state_change[constant] + (Number.isInteger(1 * state_change[constant])
                ? " ms "
                : " ")
                    + state_change.eq.kinetic.parameter, titleTextStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '20', bold: false}, textStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '14'}},
            legend: 'none',

            //for publication
                // hAxis: {title: 'a<sub>2</sub>', titleTextStyle: {isHtml: true, fontName: 'Arial', fontSize: '12', bold: false}, textStyle: {fontName: 'Arial', fontSize: '10', bold: false}},
                // vAxis: {title: '', titleTextStyle: {fontName: 'Arial', fontSize: '12', bold: false}, textStyle: {fontName: 'Arial', fontSize: '10', bold: false}},
                // height: 400,
                // width: 400,
            // tooltip: {isHtml: true, trigger: 'both'},

            seriesType: 'scatter',
            series: {'4': {color: '#e2431e', type: 'line', enableInteractivity: false}},
            height: $page.width.width(),
            width: $page.width.width()
        };

        var chart = new google.visualization.ComboChart($page.kinetic.figure[0]);
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
        $page.correlation.html(
            "<span>Pearson's r = " + pearsonCorr(data).toFixed(4) +
            ";</span> <span>Spearman's &rho; = " + spearmanCorr(data).toFixed(4) +
            "</span>"
        );
    };

    getData = function (state_change, type, constant) {
        var getObj, xData, yData, combined, dataObj;
        //Get the data for the x-axis, this is the Cycle Series stuff
        if (allSamples) {
            dataObj = DATA;
        } else {
            dataObj = state_change.sample;
        }

        getObj = {type: type};
        getObj[constant] = "Cycle Slope";
        xData = dataObj.get(getObj);
        // console.log(getObj, JSON.parse(JSON.stringify(xData)));
        xData = xData.map(function (obj) {
            return state_change.eq[type].eval(obj, "Cycle Slope"); // force ce type
        });
        // console.log(getObj, xData);

        //Get the data for the y-axis
        getObj = {type: type};
        getObj[constant] = state_change[constant];
        yData = dataObj.get(getObj);

        //combine the two
        combined = yData.map(function (obj, index) {
            return [xData[index], state_change.eq[type].eval(obj)];
        });
        // console.log(getObj, combined);

        //Add in the header
        combined.unshift(['X', 'Y']);

        return combined;
    };

    spearmanCorr = (function () {
        var numSort = function (a, b) {
            return a[0] - b[0];
        };
        return function (data) {
            var x = [], y = [], i, dataOut = [], count = 0;
            data.map(function (pnt) {
                pnt[0] = parseFloat(pnt[0]);
                pnt[1] = parseFloat(pnt[1]);
                if (
                    typeof pnt[0] === 'number' && !isNaN(pnt[0]) &&
                    typeof pnt[1] === 'number' && !isNaN(pnt[1]) &&
                    isFinite(pnt[0]) && isFinite(pnt[1])
                ) {
                    x.push([pnt[0], count]);
                    y.push([pnt[1], count]);
                    count += 1;
                }
            });
            x = x.sort(numSort);
            y = y.sort(numSort);

            for (i = 0; i < x.length; i += 1) {
                dataOut[x[i][1]] = dataOut[x[i][1]] || [];
                dataOut[y[i][1]] = dataOut[y[i][1]] || [];
                dataOut[x[i][1]][0] = i;
                dataOut[y[i][1]][1] = i;
            }

            return pearsonCorr(dataOut);
        };
    }());

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
                    typeof dataIn[i][1] === 'number' && !isNaN(dataIn[i][1]) &&
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
            var den = Math.sqrt((sqrSums[0] - sums[0] * sums[0] / n) *
                    (sqrSums[1] - sums[1] * sums[1] / n));

            if (den === 0) {
                return 0;
            }

            return num / den;
        };
    }());

    //actually start things up
    Promise.all(requires).then(function () {
        var data = KINOME.get({level: '^2'});
        if (data.length > 0 && data.get({exposure: 'Cycle Series'}).length > 0) {
            var div = KINOME.addAnalysis('Measurement Reproducibility');
            buildPage(div, data);
        }

    });

    return exports;
}(KINOME));
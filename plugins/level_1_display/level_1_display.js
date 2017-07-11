/**
 * Peptide Level 1 Display
 * Copyright 2017 Tim Kennell Jr.
 * Licensed under the MIT License (http://opensource.org/licenses/MIT)
 **
 * Returns a div that contains all of the level 1 display information
 **
 * Dependencies:
 *  * peptide picker
 */

(function(exports) {
    'use strict';

    var requires = [
        require('peptide_picker'),
        require('fit')
    ];

    var buildTab = function(data) {
        var pageStructure = {},
            baseImgUrl = "./image/?img=";
        
        pageStructure.dummyWidth = $('<div>');

        pageStructure.dummyWidth.appendTo($('<div>', {class: 'col-sm-6'})
            .appendTo($('<div>', {class: 'row'})
                .appendTo($('<div>', {class: 'container', style: 'height: 0; visibility: hidden'})
                    .appendTo('body'))));

        /**
         * Capitalizes the first letter of a string
         * @param String string The string to capitalize the first letter of
         * @return String The string with the first letter capitalized
         */
        var capitalize = function(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        };

        /**
         * Closure that allows event that is called multiple time in a row before event termination 
         *     to be called only once after event has stopped
         * Works by setting a timer when the event is called that delays the function attached to event, if event is triggered
         *     before the end of the timer, the timer is reset
         * @param Function callback The callback containing the function to trigger on the event
         * @param Float ms The time in milliseconds to wait to insure no further events will trigger
         * @param String uniqueId A unique way to identify the event to insure that events to overwrite timers
         */
        var waitForFinalEvent = (function() {
            var timers = {};
            return function(callback, ms, uniqueId) {
                if (! uniqueId) {
                    uniqueId = "Don't call this twice without a uniqueId";
                }

                if (timers[uniqueId]) {
                    clearTimeout(timers[uniqueId]);
                }
                timers[uniqueId] = setTimeout(callback, ms);
            }
        }());

        /**
         * Builds the graphs from the state provided by the peptide picker
         */
        var buildGraphs = function(state) {
            if (state.peptide !== null) {
                createGraphDisplay(state, pageStructure.chartLocations.cycleSignal, 'kinetic', 'signal');
                createGraphDisplay(state, pageStructure.chartLocations.cycleBackground, 'kinetic', 'background');
                createGraphDisplay(state, pageStructure.chartLocations.exposureSignal, 'linear', 'signal');
                createGraphDisplay(state, pageStructure.chartLocations.exposureBackground, 'linear', 'background');

                $(window).resize(function(e) {
                    waitForFinalEvent(function() {
                        createGraphDisplay(state, pageStructure.chartLocations.cycleSignal, 'kinetic', 'signal');
                        createGraphDisplay(state, pageStructure.chartLocations.cycleBackground, 'kinetic', 'background');
                        createGraphDisplay(state, pageStructure.chartLocations.exposureSignal, 'linear', 'signal');
                        createGraphDisplay(state, pageStructure.chartLocations.exposureBackground, 'linear', 'background');
                    }, 500, "bleh bleh bleh <-- my unique ID");
                });
            
            } else {
                destroyGraphs();
            }
        };

        /**
         * Destroys all the graphs created
         */
        var destroyGraphs = function() {
            pageStructure.chartLocations.cycleSignal.empty();
            pageStructure.chartLocations.exposureSignal.empty();
            pageStructure.chartLocations.cycleBackground.empty();
            pageStructure.chartLocations.exposureBackground.empty();
        }

        /**
         * Grabs the appropriate input and data based on the selected data type
         * @param Object state The state of the system that contains the sample data and the other parameters to get data
         * @param String dataType The type of data desired: 'kinetic' --> cycle information; 'linear' --> exposure information
         * @return Object The object containing the appropriate 'input' and the appropriate 'data'
         */
        var getData = function(state, dataType) {
            // console.log(state);
            var dataObj = {};

            if (dataType === 'kinetic' && state.kinetic && state.kinetic.peptide) {
                dataObj.data = state.sample.get(state.kinetic);
                dataObj.input = 'cycle';
            
            } else if (dataType === 'linear' && state.linear && state.linear.peptide) {
                dataObj.data = state.sample.get(state.linear);
                dataObj.input = 'exposure';
            
            } else {
                destroyGraphs();
            }

            return dataObj;
        }

        /**
         * Creates the tooltip for each of the data points on the graphs
         * @param String title The title for the tooltip
         * @param Object dataPoint The data point object containing the relevant information
         * @param String output Indicates which input (exposure | cycle) should be pulled from the data point
         * @param String output Indicates which output (signal | background) should be pulled from the data point
         * @param String constant String matching the value that remains constant across the graph (exposure | cycle)
         * @return 
         */
        var buildToolTip = function(dataPoint, input, output, constant) {
            var $toolTip = $('<div style="min-width: 170px; padding: 5px;"></div>'),
                title,
                titleColor;

            if (dataPoint[output + '_valid']) {
                title = 'Valid ' + capitalize(output);
                titleColor = 'green';
            } else {
                title = 'Invalid ' + capitalize(output);
                titleColor = 'red';
            }

            $toolTip.append('<span style="color: ' + titleColor + '">' + title + '</span>');
            $toolTip.append('<div style="padding-bottom: 0; margin-bottom: 0"><strong>Point</strong>: ' + dataPoint[input] + ', ' + dataPoint[output] + '</div>');
            $toolTip.append('<div style="padding-bottom: 0; margin-bottom: 0"><strong>Sample</strong>: ' + dataPoint.name + '</div>');
            $toolTip.append('<div style="padding-bottom: 0; margin-bottom: 0"><strong>Peptide</strong>: ' + dataPoint.peptide + '</div>');

            if (dataPoint.image !== undefined) {
                $toolTip.append('<div style="padding-bottom: 0; margin-bottom: 0"><strong>Image</strong>: <a href="' + baseImgUrl + encodeURIComponent('"' + dataPoint.image + '"') + '" target="_blank">' + dataPoint.image + '</a></div>');
            }

            return $toolTip[0].outerHTML;
        };

        /**
         * Puts the data into the appropriate shape for google charts, expects fit parameters from a fit equation
         * @param Array data The array of objects that contains the information to be graphed
         * @param String input The input (exposure | cycle) desired to be graphed
         * @param String output The output (signal | background) desired to be graphed
         * @param Object equation The equation object that allows calculation based on params
         * @param Array params An array of the params to use for calculation
         * @return Object The google charts object containing the data
         */
        var formatChartData = function(data, input, output, equation, params) {
            var input,
                chartData,
                toolTip;

            // Create header for the data
            chartData = new google.visualization.DataTable();
            chartData.addColumn('number', capitalize(input) + 's');
            chartData.addColumn('number', 'Valid ' + capitalize(output));
            chartData.addColumn({'type': 'string', 'role': 'tooltip', 'p': {'html': true}});
            chartData.addColumn('number', 'Invalid ' + capitalize(output));
            chartData.addColumn({'type': 'string', 'role': 'tooltip', 'p': {'html': true}});
            chartData.addColumn('number', 'Fit');

            for (var i = 0; i < data.length; i++) {
                if (data[i][output + '_valid']) {
                    toolTip = buildToolTip(data[i], input, output);
                    chartData.addRow([data[i][input], data[i][output], toolTip, NaN, '', equation.func([data[i][input]], params)]);
                } else {
                    toolTip = buildToolTip(data[i], input, output);
                    chartData.addRow([data[i][input], NaN, '', data[i][output], toolTip, equation.func([data[i][input]], params)]);
                }
            }

            return chartData;
        }

        var createEquation = function(equation, outcome) {
            var $equationLocation = $('<div></div>'),
                $equationRow,
                $equationCol,
                $R2Col,
                $equation,
                $R2,
                $Ww;

            $('<h3>Model</h3>').appendTo($equationLocation);
            $equationRow = $('<div class="row"></div>').appendTo($equationLocation);

            $equationCol = $('<div class="col-md-6"></div>').appendTo($equationRow);
            $('<h4>Equation</h4>').appendTo($equationCol);
            $equation = $('<div>').append($(KINOME.formatEquation(equation.displayEq(outcome.parameters))));
            $equation.css({
                'padding-left': '20px'
            }).appendTo($equationCol);

            $R2Col = $('<div class="col-md-6"></div>').appendTo($equationRow);
            $('<h4>R Squared</h4>').appendTo($R2Col);
            $R2 = $('<div>').append(outcome.R2.toFixed(5));
            $R2.css({'padding-left': '20px'}).appendTo($R2Col);

            if (outcome.WWtest) {
                $('<h4>Wald-Wolfowitz p-value</h4>').appendTo($equationCol);
                $Ww = $('<div>').append(outcome.WWtest[0].toFixed(5));
                $Ww.css({'padding-left': '20px'}).appendTo($equationCol);
            }

            return $equationLocation;
        };

        var createGraph = function(data, input, output, fit) {
            var chartTitle,
                $chartLocation,
                chartTitle,
                options,
                chart;

            data = formatChartData(data, input, output, fit.equation, fit[output].parameters);

            chartTitle = capitalize(input) + ' vs. ' + capitalize(output);

            options = {
                title: chartTitle,
                titleTextStyle: {
                    fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                    bold: false,
                    fontSize: '24'
                },
                hAxis: {
                    title: capitalize(input),
                    titleTextStyle: {
                        fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                        bold: false,
                        fontSize: '14'
                    }
                },
                vAxis: {
                    title: capitalize(output),
                    titleTextStyle: {
                        fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                        bold: false,
                        fontSize: '14'
                    }
                },
                tooltip: {isHtml: true, trigger: 'both'},
                seriesType: 'scatter',
                series: {'2': {type: 'line', enableInteractivity: false}},
                legend: 'none',
                height: pageStructure.dummyWidth.width() * 0.65,
                width: pageStructure.dummyWidth.width()
            };

            // location.append('<h3>' + chartTitle + '</h3>');
            $chartLocation = $('<div></div>');
            chart = new google.visualization.ComboChart($chartLocation[0]);
            chart.draw(data, options);

            return $chartLocation;
        };

        var createGraphDisplay = function(state, location, dataType, output) {
            var chartInfo;

            chartInfo = getData(state, dataType);

            // Fit data and draw chart once done
            KINOME.fit(chartInfo.data, dataType, output).then(function(fit) {
                // console.log(output, fit);
                location.empty();
                createEquation(fit.equation, fit[output]).appendTo(location);
                createGraph(chartInfo.data, chartInfo.input, output, fit).appendTo(location);
            });
        };

        var colorPeptides = function(peptideList, state) {
            var max = -Infinity,
                colorScale = [],
                logDiff;

            for (var i = 0; i < peptideList.length; i++) {
                logDiff = Math.log(peptideList[i].signal / peptideList[i].background) / Math.log(2);
                max = (logDiff > max)
                    ? logDiff
                    : max;

                colorScale.push(logDiff);
            }

            for (var i = 0; i < colorScale.length; i++) {
                colorScale[i] = colorScale[i] / max;
            }

            return Promise.resolve(colorScale);
        };

        pageStructure.superDiv = $('<div>');
        pageStructure.peptidePicker = $('<div></div>').appendTo(pageStructure.superDiv);
        pageStructure.row = $('<div class="row"></div>').appendTo(pageStructure.superDiv);
        pageStructure.signalCol = $('<div id="signal-col" class="col-sm-6"></div>').appendTo(pageStructure.row);
        pageStructure.backgroundCol = $('<div id="background-col" class="col-sm-6"></div>').appendTo(pageStructure.row);
        pageStructure.chartLocations = {};
        pageStructure.chartLocations.cycleSignal = $('<div class="graph"></div>').appendTo(pageStructure.signalCol);
        pageStructure.chartLocations.exposureSignal = $('<div class="graph"></div>').appendTo(pageStructure.signalCol);
        pageStructure.chartLocations.cycleBackground = $('<div class="graph"></div>').appendTo(pageStructure.backgroundCol);
        pageStructure.chartLocations.exposureBackground = $('<div class="graph"></div>').appendTo(pageStructure.backgroundCol);

        // Append the graphs to the page structure started by building the graphs
        var pp = KINOME.peptidePicker(data);
        pp.change(buildGraphs);
        pp.setColorFunc(colorPeptides);
        pageStructure.peptidePicker.append(pp.div);

        var toReturn = pageStructure.superDiv;
        toReturn.setColorFunc = pp.setColorFunc;

        return pageStructure.superDiv;
    };

    exports.levelOneDisplay = buildTab;

    // Promise.all(requires).then(function() {
    //     KINOME.list('levels').map(function(lvl) {
    //         var data = KINOME.get({level: lvl}),
    //             div;

    //         if (data.length) {
    //             div = KINOME.addAnalysis('Level ' + lvl + ' Visualize');
    //             div.append(buildTab(data));
    //         }
    //     });
    // });
}(KINOME));

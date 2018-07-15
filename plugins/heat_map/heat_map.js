/**
 * Peptide Heat Map
 * Copyright 2017 Tim Kennell Jr.
 * Licensed under the MIT License (http://opensource.org/licenses/MIT)
 **
 * Calls all peptides from a given sample using a provided cycle and exposure
 * Colors those peptides using
 **
 * Dependencies:
 *  * peptide picker
 *  * gradient
 *  * clusterfck (sic) from: http://harthur.github.io/clusterfck/demos/colors/clusterfck.js
 *  * d3.js
 */

/*global M require KINOME module google jQuery save $ window*/
(function () {
    'use strict';

    var buildFigures,
        requires = [
            require('bs_toggle-js'),
            require('img-picker'),
            require('gradient'),
            require('hcluster'),
            require('d3'),
            require('equation-picker'),
            require('bs_slider-js')
        ];

    var calculateValues, waitForFinalEvent;

    require("bs_toggle-css", 'style');
    require('bs_slider-css');

    waitForFinalEvent = (function () {
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

    buildFigures = function ($div, DATA) {
        var $page_obj = {},
            my_state_obj = {},
            thisState,
            eqPicker,
            pep_picked,
            imgPicker;

        $page_obj.div = $div;
        //defaults
        my_state_obj.filter = "none";
        my_state_obj.filterVal = -1;

        $page_obj.width = $('<div>', {class: 'col col-sm-6 col-xs-12'});
        $page_obj.width.appendTo($('<div>', {class: 'row'})
            .appendTo($("<div>", {class: 'container', style: "height:0px;visibility: hidden;"})
                .appendTo('body')));


        //peptide picker response
        pep_picked = function (state_object) {
            thisState = state_object;

            //wait for event end so page does not redraw more than needed.
            waitForFinalEvent(function () {
                var linearValues,
                    kineticValues,
                    linearHeatMapValues,
                    kineticHeatMapValues;

                if ($page_obj && $page_obj.heatMaps) {
                    $page_obj.linearHeatMap.empty();
                    $page_obj.kineticHeatMap.empty();
                    $page_obj.filterBar.empty();
                }

                buildSlider(DATA, my_state_obj, state_object, $page_obj.filterBar, pep_picked);

                // get initial values
                linearValues = calculateValues(DATA, state_object.eq.linear.eval, 'linear', state_object, my_state_obj.filter, my_state_obj.filterVal);
                kineticValues = calculateValues(DATA, state_object.eq.kinetic.eval, 'kinetic', state_object, my_state_obj.filter, my_state_obj.filterVal);

                linearHeatMapValues = normalizeValues(straightenItValue(clusterSamples(linearValues)));
                kineticHeatMapValues = normalizeValues(straightenItValue(clusterSamples(kineticValues)));

                // console.log(linearValues, kineticValues);
                // console.log('pep picked');

                if ($page_obj.dummyHeatMap !== undefined) {
                    // console.log(DATA);
                    $('<h3>Linear Heat Map</h3>').appendTo($page_obj.linearHeatMap);
                    createTree(linearHeatMapValues, DATA, $page_obj.dummyHeatMap).css({'margin-bottom': '10px'}).appendTo($page_obj.linearHeatMap);
                    createHeatMap(linearHeatMapValues, $page_obj.dummyHeatMap).css({'width': '100%'}).appendTo($page_obj.linearHeatMap);

                    $('<h3>Kinetic Heat Map</h3>').appendTo($page_obj.kineticHeatMap);
                    createTree(kineticHeatMapValues, DATA, $page_obj.dummyHeatMap).css({'margin-bottom': '10px'}).appendTo($page_obj.kineticHeatMap);
                    createHeatMap(kineticHeatMapValues, $page_obj.dummyHeatMap).css({'width': '100%'}).appendTo($page_obj.kineticHeatMap);
                }
            }, 100, 'pepPicker');
        };

        /*                          //
            Create page components  //
        */                          //

        $page_obj.figures = $('<div>', {class: 'row'});
        $page_obj.linear = {};
        $page_obj.kinetic = {};

        // Add in the components that create the image picker
        imgPicker = KINOME.imagePicker(DATA);
        eqPicker = KINOME.equationPicker(DATA, imgPicker, true);

        imgPicker.div.appendTo($div);
        eqPicker.div.appendTo($div);
        eqPicker.change(pep_picked);
        imgPicker.disableSample();

        // Create the parameter options
        $page_obj.figures
            .append($page_obj.linear.col)
            .append($page_obj.kinetic.col);

        //filters
        $page_obj.filterHolder = $('<div>', {'class': 'row'});
        $page_obj.filterSwitches = $('<div>', {'class': 'col-sm-6', style: 'margin-top:10px'}).append('<h4 class="page-header">Choose Pre-Clustering Filter</h4>');
        $('<div>', {'class': 'btn-group', 'data-toggle': 'buttons'})
            .append($('<label>', {'class': 'btn btn-default btn-lg active', text: 'None'})
                .append($('<input>', {'type': 'radio', 'name': 'options', 'autocomplete': 'off'}))
                .on('click', function () {
                    my_state_obj.filter = "none";
                    my_state_obj.filterVal = 0;
                    pep_picked(thisState);
                }))
            .append($('<label>', {'class': 'btn btn-default btn-lg', text: 'F-statistic'})
                .append($('<input>', {'type': 'radio', 'name': 'options', 'autocomplete': 'off'}))
                .on('click', function () {
                    my_state_obj.filter = "anova";
                    my_state_obj.filterVal = -1;
                    pep_picked(thisState);
                }))
            .append($('<label>', {'class': 'btn btn-default btn-lg', text: 'Variance'})
                .append($('<input>', {'type': 'radio', 'name': 'options', 'autocomplete': 'off'}))
                .on('click', function () {
                    my_state_obj.filter = "variance";
                    my_state_obj.filterVal = -1;
                    pep_picked(thisState);
                }))
            .appendTo($page_obj.filterSwitches);

        $page_obj.filterBar = $('<div>', {'class': 'col-sm-6', style: 'margin-top:10px'});
        $page_obj.filterHolder
            .append($page_obj.filterSwitches)
            .append($page_obj.filterBar);

        // Heat Map locations
        $page_obj.heatMaps = $('<div>', {'class': 'row'});
        $page_obj.linearHeatMap = $('<div>', {'class': 'col-sm-6'}).appendTo($page_obj.heatMaps);
        $page_obj.kineticHeatMap = $('<div>', {'class': 'col-sm-6'}).appendTo($page_obj.heatMaps);
        $page_obj.dummyHeatMap = $('<div>', {class: 'col-sm-6'})
            .appendTo($('<div>', {class: 'row'})
                .appendTo($('<div>', {style: 'height: 0px; visibility: hidden;', class: 'container'})
                    .appendTo('body')));

        // add everything to the main page divs
        $page_obj.div
            .append($page_obj.filterHolder)
            .append($page_obj.title)
            // .append($page_obj.groupHeading)
            .append($page_obj.figures)
            .append($page_obj.heatMaps);


        // re-trigger the state after building the page
        pep_picked(thisState);

        //finally add on resize function, this makes sure that the figures
        // remain the correct size.
        window.addEventListener("resize", function () {
            waitForFinalEvent(function () {
                pep_picked(thisState);
            }, 500, "resize_reproduce");
        });
    };

    /**
     * Calculates the background corrected parameter for each peptide in the data
     * @param Object data The entire array of all sample objects
     * @param Object equation An object containing the currently selected background correction equations for kinetic and linear data
     * @param String type The type (linear | kinetic) of data to calculate the values for
     * @param Object state The current state of the machine indicating cycle, exposure, and equations
     * @return Array The matrix containing all corrected parameters for all peptides across all samples
     */
    calculateValues = function(data, equation, type, state, filter, filterVal, retFilterArr) {
        var i, j, k, values = [], thisVal, anovas = [], outValues = [], thisF, pepCount = -1, sampCount = 0,
            peptides = data.list('peptides'), filterArr = [],
            getObject = {
                type: type
            };

        if (type === 'linear') {
            getObject.cycle = state.cycle;
        } else if (type === 'kinetic') {
            getObject.exposure = state.exposure;
        }

        for (i = 0; i < data.length; i += 1) {
            if (filter === 'anova') {
                values[data[i].group] = values[data[i].group] || [];
                values[data[i].group].push([]);
                thisVal = values[data[i].group][values[data[i].group].length - 1];
            } else {
                values[i] = [];
                thisVal = values[i];
            }
            for (j = 0; j < peptides.length; j += 1) {
                getObject.peptides = peptides[j];
                // console.log(equation, equation[type], data[i].get(getObject), getObject, data);
                thisVal.push(equation(data[i].get(getObject)[0]));
                // values[i].push(Math.random());
            }
        }

        if (filter === 'anova') {
            outValues = [];
            for (k = 0; k < values[0][0].length; k += 1) { // by peptide
                anovas = [];
                sampCount = 0;
                for (i = 0; i < values.length; i += 1) { // By group
                    anovas[i] = [];
                    for (j = 0; j < values[i].length; j += 1) { // By sample
                        outValues[sampCount] = outValues[sampCount] || [];
                        anovas[i].push(values[i][j][k]);
                        sampCount += 1;
                    }
                }
                //calculate f_stat
                thisF = f_stat(anovas);
                filterArr.push(thisF);

                //store the data
                if (thisF > filterVal) {
                    pepCount += 1;
                    sampCount = 0;
                    for (i = 0; i < values.length; i += 1) { // By group
                        for (j = 0; j < values[i].length; j += 1) { // By sample
                            outValues[sampCount][pepCount] = values[i][j][k];
                            sampCount += 1;
                        }
                    }
                }
            }
        } else if (filter === 'variance') {
            for (j = 0; j < values[0].length; j += 1) { // By peptide
                anovas = [];
                for (i = 0; i < values.length; i += 1) { // By sample
                    outValues[i] = outValues[i] || [];
                    anovas.push(values[i][j]);
                }
                thisF = f_stat.variance(anovas);
                filterArr.push(thisF);
                if (thisF > filterVal) {
                    pepCount += 1;
                    for (i = 0; i < values.length; i += 1) { // By sample
                        outValues[i][pepCount] = values[i][j];
                    }
                }
            }
        } else {
            outValues = values;
        }

        //This is here for the build slider function to determine min/max vals
        if (retFilterArr) {
            return filterArr;
        }

        //console.log('my out vals', outValues);
        return outValues;
    };

    var revNumSort = function (a, b) {
        return b - a;
    };

    var buildSlider = function (data, filter_state, picker_state, location, pep_picked) {

        //create a header
        $('<h4 class="page-header">' + (
            filter_state.filter === 'anova'
                ? 'Minimum Included F-statistic'
                : filter_state.filter === 'variance'
                    ? 'Minimum Included Variance'
                    : 'Select a filter'
        ) + '</h4>').appendTo(location);

        var $sliderDiv = $('<div id="filter-slider" class="sliders"></div>').appendTo(location),
            $slider = $('<input type="text" />'),
            filterVals,
            max,
            formatter,
            changer;

        formatter = function (val) {
            return val;
        };
        changer = function (val) {
            return val;
        };


        // save the state of the slider
        $slider.appendTo($sliderDiv);

        if (filter_state.filter === 'anova' || filter_state.filter === 'variance') {

            //Calculate max values
            filterVals = calculateValues(data, picker_state.eq.linear.eval, 'linear', picker_state, filter_state.filter, filter_state.filterVal, true);
            filterVals = filterVals.concat(calculateValues(data, picker_state.eq.linear.eval, 'linear', picker_state, filter_state.filter, filter_state.filterVal, true)).sort(revNumSort);

            //get max and adjust as needed
            max = filterVals[Math.floor(filterVals.length * 0.05)];
            if (max < 25) {
                formatter = function (val) {
                    var thisVal = val / 25 * max;
                    thisVal = thisVal.toPrecision(3);
                    return thisVal * 1;
                };
                changer = function (val) {
                    return val * 25 / max;
                };
            }

            if ((!filter_state.filterVal && filter_state.filterVal !== 0) || filter_state.filterVal < 0 || filter_state.filterVal > max) {
                filter_state.filterVal = max / 25 * 2;
            }

            $slider.slider({
                value: changer(filter_state.filterVal),
                min: 0,
                max: changer(max),
                tooltip_position: 'bottom',
                tooltip: 'always',
                formatter: formatter
            }).on('slideStop', function (e) {
                if (e.value !== changer(filter_state.filterVal)) {
                    filter_state.filterVal = formatter(e.value);
                    pep_picked(picker_state);
                }
            });
        } else {
            $slider.slider({
                value: 1,
                min: 0,
                max: 2,
                tooltip_position: 'bottom',
                tooltip: 'always',
                enabled: false,
                formatter: function () {
                    return "N/A";
                }
            });
        }
    };

    var capitalize = function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    var matrix_transpose = function (M) {
        return M[0].map(function (col, i) {
            return M.map(function (row) {
                return row[i];
            });
        });
    };

    var straightenItValue = function (clust) {
        if (clust.left) {
            return straightenItValue(clust.left).concat(straightenItValue(clust.right));
        }
        return [clust.value];
    };

    var straightenItIndex = function (clust) {
        if (clust.left) {
            return straightenItIndex(clust.left).concat(straightenItIndex(clust.right));
        }
        return [clust.key];
    };

    var clusterSamples = function(values) {
        var matrixTranspose,
            peptideCluster,
            peptideClusteredMatrix;

        matrixTranspose = matrix_transpose(values);
        peptideCluster = KINOME.hcluster(matrixTranspose, 'euclidean', 'average');
        peptideClusteredMatrix = matrix_transpose(straightenItValue(peptideCluster));
        return KINOME.hcluster(peptideClusteredMatrix, 'euclidean', 'average');
    };

    /**
     * Normalizes the values of a matrix by the maximum value found in a matrix
     * @param Array values The matrix that contains the values to normalize
     * @return Array The matrix containing all corrected parameters for all peptides across all samples
     */
    var normalizeValues = function(values) {
        var i, j, max = -Infinity,
            min = Infinity;

        for (i = 0; i < values.length; i += 1) {
            // find max
            for (j = 0; j < values[i].length; j += 1) {
                if (!Number.isNaN(values[i][j])) {
                    max = Math.max(values[i][j], max);
                    min = Math.min(values[i][j], min);
                }
            }
        }

        // divide all values by max to normalize
        for (i = 0; i < values.length; i += 1) {
            for (j = 0; j < values[i].length; j += 1) {
                values[i][j] = (values[i][j] - min) / (max - min);
            }
        }

        return values;
    };

    /**
     * Recursive tree construction for treant.js from cluster
     * @param Object clust The cluster from hcluster
     */
    var tree = function(clust, data) {
        if (clust.left) {
            return {children: [tree(clust.left, data), tree(clust.right, data)]};
        }
        return {name: 'G' + data[clust.key].group, samp: 'S' + clust.key};
    };

    var createTree = function(values, data, widthDiv) {
        var cluster,
            treeStructure,
            $treeDiv = $('<div>'),
            json;

        cluster = clusterSamples(values);
        // console.log(data);
        json = tree(cluster, data);

        var width = widthDiv.width(),
            height = 180;

        cluster = d3.layout.cluster()
            .size([width - 10, height - 70]);

        var svg = d3.select($treeDiv[0]).append("svg")
            .attr("width", width)
            .attr("height", height)
          .append("g")
            .attr("transform", "translate(5,40)");

        var nodes = cluster.nodes(json);

        var link = svg.selectAll(".link")
          .data(cluster.links(nodes))
        .enter().append("path")
          .attr("class", "link")
          .attr("d", elbow);

        var node = svg.selectAll(".node")
          .data(nodes)
        .enter().append("g")
          .attr("class", "node")
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })

        node.append("circle")
          .attr("r", 4.5);

        node.append("text")
          .attr("dy", 17)
          .attr("dx", -7)
          .attr("text-anchor", function(d) { return d.children ? "end" : "start"; })
          .text(function(d) { return d.name; });

          node.append("text")
          .attr("dy", 30)
          .attr("dx", -7)
          .attr("text-anchor", function(d) { return d.children ? "end" : "start"; })
          .text(function(d) { return d.samp; });

        function elbow(d, i) {
          return "M" + d.source.x + "," + d.source.y
              + "H" + d.target.x + "V" + d.target.y;
        }

        $('head').append('<style>.node circle {fill: #fff;stroke: steelblue;  stroke-width: 1.5px;} .node {  font: 10px sans-serif;} .link {  fill: none;  stroke: #ccc;  stroke-width: 1.5px;}</style>');

        return $treeDiv;
    };

    var createHeatMap = function(values, widthDiv) {
        var i, j, canvas = document.createElement('canvas'),
            ctx,
            numRows = values[0].length,
            numCols = values.length,
            rowScale = numRows < 80 
                ? 4 * 80 / numRows
                : 4,
            colScale;

        canvas.width = widthDiv.width();
        canvas.height = numRows * rowScale;
        colScale = canvas.width / numCols;

        ctx = canvas.getContext('2d');

        for (i = 0; i < values.length; i += 1) {
            for (j = 0; j < values[i].length; j += 1) {
                ctx.fillStyle = KINOME.gradient.convert(values[i][j]);
                ctx.fillRect(i * colScale, j * rowScale, colScale, rowScale);
            }
        }

        return $(canvas);
    };

    var f_stat = (function () {
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
        var main = function (arrs) {
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

        main.variance = function (arr) {
            return sse(arr) / (arr.length - 1);
        };

        return main;
    }());

    //get stuff building
    (function () {
        Promise.all(requires).then(function () {
            var $div = KINOME.addAnalysis('Heat Map');
            buildFigures($div, KINOME.get({level: '^2'}));
        });
    }());
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : window
));
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
            require('d3')
        ];

    require("bs_toggle-css", 'style');

    buildFigures = function ($div, DATA) {
        var build_columns,
            $page_obj = {},
            equation,
            minimums = {
                linear: {},
                kinetic: {}
            },
            retSignal,
            retBack,
            getOneDataSet,
            my_state_obj = {},
            retSigDBack,
            retSigMBack,
            pep_picked,
            thisState,
            limits = {
                linear: {},
                kinetic: {}
            },
            currentEQnum = {
                linear: 2,
                kinetic: 2
            },
            makeOneChart,
            uppercase,
            imgPicker;

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
                return 0;
            } else {
                return Math.log(object.signal.parameters[my_state_obj[type].param] - object.background.parameters[my_state_obj[type].param] - (min) + 1) / Math.log(2);
            }
        };
        //initialize
        equation = {kinetic: retSigDBack, linear: retSigDBack};

        uppercase = function (str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        };

        //peptide picker response
        pep_picked = function (state_object) {
            thisState = state_object;

            // console.log(state_object);

            var linearValues,
                kineticValues,
                linearHeatMapValues,
                kineticHeatMapValues,
                linearHeatMap,
                kineticHeatMap;

            if ($page_obj && $page_obj.heatMaps) {
                $page_obj.linearHeatMap.empty();
                $page_obj.kineticHeatMap.empty();
            }

            // get initial values
            linearValues = calculateValues(DATA, equation, 'linear', state_object);
            kineticValues = calculateValues(DATA, equation, 'kinetic', state_object);

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

            // console.log(state_object, equation, my_state_obj, currentEQnum);
        };

        /*                          //
            Create page components  //
        */                          //

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
                .append(part.f_val);

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

        // Add in the components that create the image picker
        imgPicker = KINOME.imagePicker(DATA);
        imgPicker.div.appendTo($div);
        imgPicker.change(pep_picked);
        imgPicker.disableSample();

        // Create the parameter options
        build_columns('linear');
        build_columns('kinetic');
        $page_obj.figures
            .append($page_obj.linear.col)
            .append($page_obj.kinetic.col);

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
            .append($page_obj.title)
            // .append($page_obj.groupHeading)
            .append($page_obj.figures)
            .append($page_obj.heatMaps);


        // re-trigger the state after building the page
        pep_picked(thisState);

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

    /**
     * Calculates the background corrected parameter for each peptide in the data
     * @param Object data The entire array of all sample objects
     * @param Object equation An object containing the currently selected background correction equations for kinetic and linear data
     * @param String type The type (linear | kinetic) of data to calculate the values for
     * @param Object state The current state of the machine indicating cycle, exposure, and equations
     * @return Array The matrix containing all corrected parameters for all peptides across all samples
     */
    var calculateValues = function(data, equation, type, state) {
        var values = [],
            peptides = data.list('peptides'),
            getObject = {
                type: type
            };

        if (type === 'linear') {
            getObject.cycle = state.cycle;
        } else if (type === 'kinetic') {
            getObject.exposure = state.exposure;
        }

        for (var i = 0; i < data.length; i++) {
            values[i] = [];
            for (var j = 0; j < peptides.length; j++) {
                getObject.peptides = peptides[j];
                // console.log(equation, equation[type], data[i].get(getObject), getObject, data);
                values[i].push(equation[type](data[i].get(getObject)[0], type));
                // values[i].push(Math.random());
            }
        }

        return values;
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
        var max = -Infinity,
            min = Infinity;

        for (var i = 0; i < values.length; i++) {
            // find max
            for (var j = 0; j < values[i].length; j++) {
                if (! isNaN(values[i][j])) {
                    max = Math.max(values[i][j], max);
                    min = Math.min(values[i][j], min);
                }
            }
        }

        // divide all values by max to normalize
        for (var i = 0; i < values.length; i++) {
            for (var j = 0; j < values[i].length; j++) {
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

        var cluster = d3.layout.cluster()
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
        var canvas = document.createElement('canvas'),
            ctx,
            numRows = values[0].length,
            numCols = values.length,
            rowScale = 4,
            colScale;

        canvas.width = widthDiv.width();
        canvas.height = numRows * rowScale;
        colScale = canvas.width / numCols;

        ctx = canvas.getContext('2d');

        for (var i = 0; i < values.length; i++) {
            for (var j = 0; j < values[i].length; j++) {
                ctx.fillStyle = KINOME.gradient.convert(values[i][j]);
                ctx.fillRect(i * colScale, j * rowScale, colScale, rowScale);
            }
        }

        return $(canvas);
    };

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
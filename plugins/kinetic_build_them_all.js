/**
 * Paste Below first at redirect from: http://bit.kinomecore.com/?siac_demo
 */

var GENE_CORR_DIV = KINOME.addAnalysis('Gene / Kinome Corr All');

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
 * Adds the header to the page
 * @param {jQuery Object} $pageDiv The DOM object provided by the kinome toolbox representing the div to attach the input to
 * @return void
 */
var constructPageHeader = function($pageDiv) {
    $pageDiv.append($('<h1>Kinomic vs. Transcriptomic Correlational Analysis</h1>'));
};

var createPeptideAffySelector = function($div) {
    var $masterDiv = $('<div>'),
        $buttonDiv = $('<div class="btn-group" data-toggle="buttons">'),
        $affyButton = $('<label class="btn btn-primary"></label>'),
        $peptideButton = $('<label class="btn btn-primary active"></label>');

    $div.append($masterDiv);
    $masterDiv
        .append($('<label style="display: block">Data Selector</label>'))
        .append($buttonDiv);

    $buttonDiv
        .append($peptideButton)
        .append($affyButton);

    $peptideButton.html('<input type="radio" name="data-type" autocomplete="off" checked> Peptide');
    $affyButton.html('<input type="radio" name="data-type" autocomplete="off" checked> Affy');

    return $buttonDiv;
}

/**
 * Creates a dropdown for selecting peptides for correlational analysis
 * @param {Array} peptides Array of peptides
 * @param {jQuery Object} $div The div to attach the dropdown to
 */
var createPeptideSelector = function(peptides, $div) {
    var $dropDownDiv = $('<div class="form-group"></div>'),
        $dropDown = $('<select class="form-control"></select>');

    $div.append($dropDownDiv);
    
    $dropDownDiv
        .append($('<label>Peptide Probe</label>'))
        .append($dropDown);

    for (var i = 0; i < peptides.length; i++) {
        $dropDown.append($('<option value="' + peptides[i] + '">' + peptides[i] + '</option>'))
    }

    return $dropDown;
};

/**
 * Creates the correlation cutoff text box that will limit the graph's display to point above threshold
 * @param {jQuery Object} $div The DOM object to attach the input to
 * @return {jQuery Object} The input for use with events later
 */
var createCorrelationCutoffInput = function($div) {
    var $formDiv = $('<div class="form-group"></div>'),
        $label = $('<label>Correlation Limit</label>'),
        $input = $('<input type="text" class="form-control" />');
        
    $div.append($formDiv);
    $formDiv
        .append($label)
        .append($input);

    return $input;
};


/**
 * Correlate the peptide signal with the affy data signal and DRAW MANHATTAN plots
 * @param {Array} peptides Array of peptide names for use to acquire peptide data with kinome SDK
 * @param {Array} geneData Array of gene averages for correlation with the peptide information
 * @param {Integer} threshold The correlation threshold for showing data (only points above threshold shown)
 * @param {jQuery DOM Object} $pageDiv The DOM object provided by the kinome toolbox representing the div to attach the input to 
 */
var correlatePeptidesAndAffy = function(peptides, geneData, gene_names) {
    var allGraphCorr = [];

    peptides.map(function (pep_name) {
        //Get the averages
        var kinome_averages = [];
        for (i = 0; i < 10; i += 1) {
            //First start here is for kinetic data
            kinome_averages.push(KINOME.get({group: i}).get({peptide:pep_name, cyle: 50, type: 'kinetic'}).map(function(x) {
                //This second line if for linear data
                // kinome_averages.push(KINOME.get({group: i}).get({peptide:pep_name, cycle: 'Post Wash', type: 'linear'}).map(function(x) {
                return Math.log2(x.signal.parameters[0] / x.background.parameters[0])
            }).reduce(STATS.sum) / 3);
        }
        corr_array = [];
        // var true_corr_array = [];
        for (i = 0; i < geneData.length; i += 1) {
            correlation = STATS.corr.pearson(STATS.matrix.transpose([kinome_averages, geneData[i]]));
            // Updated transform to only show up to 0.99,
                // all values > will be set to 0.99 for display
            corr_transform = Math.abs(correlation) < (1 - 1e-2)
                ? -Math.log10(1 - Math.abs(correlation))
                : -Math.log10(1e-2);
            // true_corr_array.push(corr_transform);
            corr_array.push([i, corr_transform, gene_names[i] + ' : ' + correlation]);
        }

        allGraphCorr.push({graph_data: corr_array, title: pep_name});

        // console.log(Math.max.apply(null, true_corr_array))
    //    drawManhattan(corr_array, pep_name, $graphDiv);
    });
    return allGraphCorr;
};

/**
 * Limits correlations to those above a threshold and then draws all the manhattan plots and 
 * @param {Array} allCorrArray The array of correlation object in which a single item --> {graph_data: [i, correlation, tooltip], title: "graph_title"}
 * @param {Integer} threshold Numerical integer giving cutoff for displaying correlations in graph
 * @param {*} $graphDiv The div for putting all the graphs inside
 */
var drawAllManhattans = function(allCorrArray, peptide, threshold, $graphDiv) {
    var allFinalGraphData = [],
        singleGraphData = [];

    threshold = threshold || 0;

    console.log('peptide', peptide);
    console.log('threshold', threshold);
    console.log('corr array', allCorrArray);
    $graphDiv.empty();

    // limit data points by threshold and add remaining correlations to new array structure
    for (var i = 0; i < allCorrArray.length; i++) {
        singleGraphData = [];

        // only show graphs from the selected peptide
        if (allCorrArray[i].title === peptide) {
            for (var j = 0; j < allCorrArray[i].graph_data.length; j++) {
                // select only those data points above the threshold
                if (allCorrArray[i].graph_data[j][1] > threshold) {
                    singleGraphData.push(allCorrArray[i].graph_data[j]);
                }
            }
            allFinalGraphData.push({graph_data: singleGraphData, title: allCorrArray[i].title});
        }
    }
    console.log('final graph data', allFinalGraphData);

    for (var i = 0; i < allFinalGraphData.length; i++) {
        drawManhattan(allFinalGraphData[i].graph_data, allFinalGraphData[i].title.replace(/_/g, '-'), $graphDiv);
    }
};

var drawManhattan = function(dataIn, title, $pageDiv) {
    var data = new google.visualization.DataTable();
    data.addColumn('number', 'Correlation Pair');
    data.addColumn('number', 'Pearson Correlation Score');
    data.addColumn({type: 'string', role: 'tooltip'});
    data.addRows(dataIn);
    var options = {
        title: 'Correlation of genes ' + title,
        legend: 'none',
        seriesType: 'scatter',
        pointSize: 2,
        height: 500,
        // enableInteractivity: false,
        hAxis: {title: 'Genes', textPosition: 'none'},
        vAxis: {title: 'Transformed Correlation', viewWindow: {min: 0, max: 2}}
    };
    var div = $('<div>');
    $pageDiv.append(div);
    var chart = new google.visualization.ScatterChart(div[0]);
    chart.draw(data, options);
};
/**
 *End First Paste
 */


/**
 * Navigate to new open tab, then paste this
 */

require('http://db.kinomecore.com/file/TMZPairsrmaSketchNormalizedAnnotated.txt').then(function (file_string) {
    'use strict';
    var data_parsed = TABULAR.parse(file_string);
    return TABULAR.enrich({
        data: data_parsed,
        has_header: true,
        has_row_label: true
    });
}).then(function (affy_data) {
    var i, j, anova_cut_off = 2.293802991158177;
    var affy_names = [
        ["10-12-1_(HuEx-1_0-st-v2).CEL", "10-12-2_(HuEx-1_0-st-v2).CEL", "10-12-3_(HuEx-1_0-st-v2).CEL"],
        ["10-11-1_(HuEx-1_0-st-v2).CEL", "10-11-2_(HuEx-1_0-st-v2).CEL", "10-11-3_(HuEx-1_0-st-v2).CEL"],
        ["10-17-1_(HuEx-1_0-st-v2).CEL", "10-17-2_(HuEx-1_0-st-v2).CEL", "10-17-3_(HuEx-1_0-st-v2).CEL"],
        ["10-26-1_(HuEx-1_0-st-v2).CEL", "10-26-2_(HuEx-1_0-st-v2).CEL", "10-26-3_(HuEx-1_0-st-v2).CEL"],
        ["10-20-1_(HuEx-1_0-st-v2).CEL", "10-20-2_(HuEx-1_0-st-v2).CEL", "10-20-3_(HuEx-1_0-st-v2).CEL"],
        ["10-173-1_(HuEx-1_0-st-v2).CEL", "10-173-2_(HuEx-1_0-st-v2).CEL", "10-173-3_(HuEx-1_0-st-v2).CEL"],
        ["10-19-1_(HuEx-1_0-st-v2).CEL", "10-19-2_(HuEx-1_0-st-v2).CEL", "10-19-3_(HuEx-1_0-st-v2).CEL"],
        ["10-15-1_(HuEx-1_0-st-v2).CEL", "10-15-2_(HuEx-1_0-st-v2).CEL", "10-15-3_(HuEx-1_0-st-v2).CEL"],
        ["10-36-1_(HuEx-1_0-st-v2).CEL", "10-36-2_(HuEx-1_0-st-v2).CEL", "10-36-3_(HuEx-1_0-st-v2).CEL"],
        ["10-23-1_(HuEx-1_0-st-v2).CEL", "10-23-2_(HuEx-1_0-st-v2).CEL", "10-23-3_(HuEx-1_0-st-v2).CEL"]
    ];

    var geneData = [], genesRemained;
    //now grab genes
    for (i = 0; i < 10; i += 1) {
        //grab each group
        geneData.push(affy_data.get({headers: affy_names[i]}).data);
    }

    //transpose Gene Data
    geneData = STATS.matrix.transpose(geneData);
    geneAnovas = geneData.map(STATS.anova);

    genesRemaining = [];

    for (i = 0; i < geneAnovas.length; i += 1) {
        if (geneAnovas[i] > anova_cut_off) {
            genesRemaining.push(i);
        }
    }

    // now grab gene averages
    geneData = [];
    for (i = 0; i < 10; i += 1) {
        //grab each group
        geneData.push(affy_data.get({headers: affy_names[i], row_index: genesRemaining}).data.map(function (x) {return x.reduce(STATS.sum) / 3; }));
    }

    geneData  = STATS.matrix.transpose(geneData);

    var geneNames = affy_data.get({headers: affy_names[0][0], row_index: genesRemaining}).row_labels;

    return {affy: geneData, affy_genes: geneNames};
}).then(function (data) {
    "use strict";
    //Grab each peptide
    var { affy: geneData, affy_genes: gene_names } = data;
    console.log('gene data', geneData);
    console.log('gene names', gene_names);
    var peptides = KINOME.get({group: 1}).list("peptides"),
        $thresholdInput,
        $peptideSelect,
        correlations,
        $inputRow = $('<div class="row"></div>'),
        $dataSelectorDiv = $('<div class="col-sm-4"></div>'),
        $peptideDiv = $('<div class="col-sm-4"></div>'),
        $thresholdDiv = $('<div class="col-sm-4"></div>'),
        $graphDiv = $('<div>');

    // page construction
    constructPageHeader(GENE_CORR_DIV);
    GENE_CORR_DIV.append($inputRow);
    $inputRow
        .append($dataSelectorDiv)
        .append($peptideDiv)
        .append($thresholdDiv);

    createPeptideAffySelector($dataSelectorDiv);
    $peptideSelect = createPeptideSelector(peptides, $peptideDiv);
    $thresholdInput = createCorrelationCutoffInput($thresholdDiv);
    GENE_CORR_DIV.append($graphDiv);

    correlations = correlatePeptidesAndAffy(peptides, geneData, gene_names);
    drawAllManhattans(correlations, peptides[0], null, $graphDiv);

    $thresholdInput.on('input', function() {
        var value = $(this).val();
        waitForFinalEvent(function(){
            // console.log(value);
            drawAllManhattans(correlations, $peptideSelect.val(), value, $graphDiv);
        }, 500, "bleh bleh bleh <-- unique ID :D :P");
    });

    $peptideSelect.change(function() {
        var value = $(this).val();
        waitForFinalEvent(function(){
            drawAllManhattans(correlations, value, $thresholdInput.val(), $graphDiv);
        }, 500, "bleh bleh bleh bleh bleh <-- unique ID :D :P");
    })
});
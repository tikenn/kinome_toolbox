/**
 * Peptide Picker
 * Copyright 2017 Tim Kennell Jr.
 * Licensed under the MIT License (http://opensource.org/licenses/MIT)
 **
 * Display Microarray Data in visible format for comparison of samples, 
 *     peptides, cycles, and exposures
 */

// var DIV = KINOME.addAnalysis('tims special'),
//     data = KINOME.list({level:'1.0.1'}),
//     state,
//     stateFunction = function(state) {
//         // console.log(state);
//     };

(function(exports) {
    "use strict";

    require('bs_slider-js');
    require('bs_slider-css');
    require('peptide_picker-css', 'css', false);
    require('gradient');

    /**
     * Function that displays peptide data at a given level
     * @param JSON data The data object for display purposes
     * @param jQuery object The div that will contain the display, assumed to be a bootstrap container with a UUID id on it
     * @param Object state The initial state of the display based on the current value of following properties: sample, peptide, cycle, exposure
     * @param Function stateFunction A callback function that takes in the current state and allows the user to see the state or use the state if desired
     */
    var display = function(data) {

        var pageStructure = {},
            baseImgUrl = "./image/?img=",
            previousState,
            state = {},
            main = {},
            peptideMatrix;

        /* ==============================================================
         * Major Page Structure
         * ============================================================== */

        pageStructure.peptideMatrixDummy = $('<div>').appendTo($('<div class="col-sm-6 col-md-5"></div>')
            .appendTo($('<div class="container" style="height: 0px; visibility: hidden"></div>')
                .appendTo('body')));

        pageStructure.container = $('<div id="peptide-picker-container" class="container"></div>');
        pageStructure.row = $('<div class="row"></div>').appendTo(pageStructure.container);
        pageStructure.peptidePickerCol = $('<div class="col-sm-6 col-md-5"></div>').appendTo(pageStructure.row);
        pageStructure.metaDataCol = $('<div id="metadata-col" class="col-sm-6 col-md-7 bottom-column"></div>').appendTo(pageStructure.row);
        pageStructure.cycleExposureRow = $('<div id="cycle-exposure-row" class="row"></div>').appendTo(pageStructure.metaDataCol);
        pageStructure.metaDataDisplay = $('<div>').appendTo(pageStructure.metaDataCol);
        pageStructure.gradientScale = undefined;
        pageStructure.dataTable = undefined;


        /* ==============================================================
         * Helper Functions
         * ============================================================== */

        /**
         * Deep copies an object and returns it
         * @param Object object The object to deep copy
         * @return Object The deep copy of the object
         */
        var clone = function(object) {
            if (!object.sample || !object.sample.clone) {
                object.sample = {
                    clone: function () {
                    return null;
                    }
                };
            }
            return {
                sample: object.sample.clone(),
                peptide: object.peptide,
                exposure: object.exposure,
                cycle: object.cycle,
                kinetic: {
                    peptide: object.peptide,
                    exposure: object.exposure
                },
                linear: {
                    peptide: object.peptide,
                    cycle: object.cycle
                }
            };
        };

        /**
         * Capitalizes the first letter of a string
         * @param String string The string to capitalize the first letter of
         * @return String The string with the first letter capitalized
         */
        var capitalize = function(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        };


        /* ==============================================================
         * Peptide Picker State
         * ============================================================== */

        /**
         * Define the state of the display, this will allow the display to be preset based on previous information
         * The state object
         *  * sample:  a single sample object equivalent to KINOME.get({level:'1.0.1'}).name
         *  * peptide:  the name of the peptide selected, equivalent to KINOME.get({level: '1.0.1'})[i].list('peptides').more()[j].name
         *  * cycle:  the current cycle of the state
         *  * exposure:  the current exposure level of the state
         */
        state.sample = state.sample || data[0];
        state.peptide = state.peptide || null;
        state.cycle = state.cycle || null;
        state.exposure = state.exposure || null;
        previousState = clone(state);

        // if state function not passed, just create empty function
        var defaultStateFunction = function() { return },
            stateFunction = defaultStateFunction;

        /**
         * Checks for a change in state based on a current state and a previous state and fires the stateFunction if there is a change
         * @param Object state The current state of the system
         * @param Object previousState The previous state of the system
         */
         var fireState = function(stateIGNORE, previousStateIGNORE, force) {
            // console.log(previousState);
            // console.log(clone(state), clone(previousState));
            if (state.sample.name !== previousState.sample.name
                || state.peptide !== previousState.peptide
                || state.exposure !== previousState.exposure
                || state.cycle !== previousState.cycle
                || force
            ) {
                //check to see if stuff is ok. The attempt here was to hide the
                    // ppicker if an invalid state was selected. I chose instead
                    // to fix the coloring so it would just go black. May want
                    // this again at some point. So do not delete.
                // var tempState = clone(state);
                // if (tempState.peptide === null) {
                //     delete tempState.peptide;
                // }
                // if (state.sample && !state.sample.get(tempState).length) {
                //     console.log('should hide stuff now?');
                // } else {
                //     console.log('showing stuff');
                // }
                stateFunction(clone(state));
                setPeptideColors();
                previousState = clone(state);
            }
         };


        /* ==============================================================
         * Default color functions
         * ============================================================== */

        var defaultColorPeptideFunc = function(peptideList, state) {
            var colorArray = [];
            for (var i = 0; i < peptideList.length; i++) {
                // colorArray.push(Math.random());
                colorArray.push('#191919');
            }

            return Promise.resolve(colorArray);
        };

        var colorPeptideFunc = defaultColorPeptideFunc;

        /**
         * Returns an HSL color using a gradient when given a number between 0 and 1 inclusive
         * @param Float number The number between 0 and 1
         * @param String The string representing the gradient
         */
        // var createGradient = function(number) {
        //     var hue,
        //         minHue = 60,
        //         maxHue = 255,
        //         hueRange = maxHue - minHue,
        //         saturation,
        //         minSaturation = 70,
        //         maxSaturation = 100 - minSaturation,
        //         lightness,
        //         minLightness = 30,
        //         maxLightness = 60 - minLightness,
        //         eScale = Math.exp(number) / Math.E;

        //         hue = hueRange * Math.pow(1 - number, 2) + minHue;
        //         saturation = eScale * maxSaturation + minSaturation;
        //         lightness = eScale * maxLightness + minLightness;

        //         return 'hsl(' + hue + ', ' + saturation + '%, ' + lightness + '%)';
        // };

        /**
         * Colors the peptides using the method established when displaying the peptide matrix
         *     Accepts an array of values between 0 and 1 inclusive
         * @param Array peptideColors An array of values between 0 and 1 inclusive that will be translated into the hsl() color space
         */
        var colorPeptides = function(peptideColors) {
            var cssHsl, colorNum;

            for (var i = 0; i < peptideMatrix.length; i++) {
                colorNum = peptideColors[i] * 1;
                if (!Number.isFinite(colorNum)) {
                    cssHsl = '#191919';
                } else {
                    colorNum = colorNum > 1
                        ? 1
                        : colorNum < 0
                            ? 0
                            : colorNum;

                    cssHsl = KINOME.gradient.convert(colorNum);
                }
                peptideMatrix[i].changeSpotColor(cssHsl);
            }
        };

        var setPeptideColors = function() {
            var peptideList, theProm;
            if (state.sample.level.match(/^1/i)) {
                peptideList = state.sample.get({cycle: state.cycle, exposure: state.exposure});
            } else if (state.sample.level.match(/^2/i)) {
                peptideList = {
                    kinetic: state.sample.get({cycle: state.cycle, exposure: state.exposure, type: 'kinetic'}),
                    linear: state.sample.get({cycle: state.cycle, exposure: state.exposure, type: 'linear'})
                }
            }
            if (!peptideList.length && (!(peptideList.kinetic && peptideList.kinetic.length) ||!(peptideList.linear && peptideList.linear.length))) {
                theProm = defaultColorPeptideFunc(state.sample.list('peptide'))
            } else {
                theProm = colorPeptideFunc(peptideList, state);
            }
            theProm.then(function(peptideColors) {
                // console.log(peptideColors);
                colorPeptides(peptideColors);
            })
            .catch(function(err) {
                console.warn('The peptide color function expects a promise', err);
                return err;
            });
        };

        pageStructure.gradientScale = KINOME.gradient.colorBar(10, 150).hide();


        /* ==============================================================
         * Table functions
         * ============================================================== */

        /**
         * Expects the result of state.sample.get({peptide: state.peptide, exposure: state.exposure, cycle: state.cycle})
         * @param Object quadfecta The object that results from the above process
         * @return Array An array of two pieces that that contains key value pair objects
         */
        var defaultTableFunc = function(quadfecta) {
            if (quadfecta) {
                return [
                    {
                        "key": "Signal",
                        "value": quadfecta.signal
                    },
                    {
                        "key": "Background",
                        "value": quadfecta.background
                    }
                ];
            }

            return [
                    {
                        "key": "Signal",
                        "value": undefined
                    },
                    {
                        "key": "Background",
                        "value": undefined
                    }
            ];
        };

        var tableFunc = defaultTableFunc;


        /* ==============================================================
         * Main Return Object
         * ============================================================== */

        main.div = pageStructure.container;
        
        /**
         * Create a new state function based on users input and forcibly fire the state
         * @param Function customStateFunction The new state function to fire on state change
         */
        main.change = function(customStateFunction) {
            if (typeof customStateFunction === 'function') {
                stateFunction = customStateFunction;
                fireState(clone(state), {sample: {name: null}}, true);//force the fire
            } else {
                console.error('The change function of peptide picker expects a function');
            }
        };

        /**
         * Forcibly sets the state of the system and fires the state function
         * @param Object customState The new state to set the peptide picker to
         */
        main.setState = function(customState) {
            var keys,
                customKeys,
                changeFlag;

            keys = Object.keys(state);
            for (var i = 0; i < keys.length; i++) {
                if (customState[keys[i]] !== state[keys[i]]) {
                    state[keys[i]] = customState[keys[i]];
                    changeFlag = 1;
                }
            }

            if (changeFlag) {
                stateFunction(state);
            }
        };

        /**
         * Disables the sample if it is unecessary
         */
        main.disableSample = function() {
            pageStructure.peptidePickerCol.children().children().children('select').prop('disabled', true);
        };

        /**
         * Sets a custom color function that changes the color of the peptide matrix based on a user defined function
         * @param Function customColorFunc A user defined function that receives the peptide list at a specific exposure and cycle and is expected to return a promise
         */
        main.setColorFunc = function(customColorFunc) {
            if (typeof customColorFunc === 'function') {
                colorPeptideFunc = customColorFunc;
                setPeptideColors();
                pageStructure.gradientScale.show();
            } else {
                colorPeptideFunc = defaultColorPeptideFunc;
                pageStructure.gradientScale.hide();
                console.warn('The setColorFunc expects a function, not this', customColorFunc);
            }
        };

        main.setTable = function(customTableFunc) {
            if (typeof customTableFunc === 'function') {
                tableFunc = customFunc;
                createDataTable(state.sample, state.peptide, state.cycle, state.exposure);
            } else {
                tableFunc = defaultTableFunc;
                console.warn('The setTable function requires a function argument, not this', customTableFunc);
            }
        }

        /* ==============================================================
         * Main
         * ============================================================== */

        // expecting level 1.0.1 data for now
        var displaySamples = function(data) {
            var $peptidePickerTitle = $('<h2 class="page-header">Peptide Picker</h2>').appendTo(pageStructure.peptidePickerCol),
                
                $sampleRow = $('<div class="row"></div>').appendTo(pageStructure.peptidePickerCol),
                $sampleCol = $('<div class="col-sm-6"></div>').appendTo($sampleRow),
                $searchCol = $('<div class="col-sm-6 bottom-column"></div>').appendTo($sampleRow),
                
                $sampleDropdownLabel = $('<label for="sample-dropdown">Sample: </label>').appendTo($sampleCol),
                $sampleDropdown = $('<select id="sample-dropdown" class="form-control"></select>').appendTo($sampleCol),

                $searchLabel = $('<label for="peptide-search">Peptide Search: </label>').appendTo($searchCol),
                $searchBox = $('<input type="text" id="peptide-search" class="form-control" placeholder="regexp" />').appendTo($searchCol);

                pageStructure.peptideMatrix = $('<div id="peptide-picker"></div>').appendTo(pageStructure.peptidePickerCol);

            // create dropdown
            for (var i = 0; i < data.length; i++) {
                if (state && typeof state === 'object' && state.sample === data[i].name) {
                    $sampleDropdown.append('<option selected value=' + i + '>' + data[i].name + '</option>');
                
                } else {
                    $sampleDropdown.append('<option value=' + i + '>' + data[i].name + '</option>');
                }
            }

            loadPeptides(data, pageStructure.peptidePickerCol, $sampleDropdown, $searchBox);
        };

        /**
         * Searches through peptides for all matches to a given search string and changes the peptides not matched to lowered opacity
         * @param String searchString The string to match in a case-insensitive manner (regex accepted)
         * @param Array peptideList The array of peptides to search through
         */
        var peptideSearch = function(searchString, peptideList) {
            var matchedPeptideIndices = [],
                searchPattern = new RegExp(searchString, 'i'),
                peptideString;

            for (var i = 0; i < peptideList.length; i++) {
                peptideString = retrievePeptideData(peptideList[i], true);

                if (! peptideString.match(searchPattern)) {
                    peptideList[i].changeSpotOpacity(0.1);
                
                } else {
                    peptideList[i].changeSpotOpacity(1);
                }
            }
        };

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

        var loadPeptides = function(data, displayDiv, sampleDropdown, searchBox) {
            // Automatically display first list of peptides onload
            var currentPeptideList = data[0].list('peptides').more(),
                currentPeptideListIndex = 0;

            currentPeptideList = displayPeptides(currentPeptideList, displayDiv);

            // load in other peptide list when selected from dropdown
            sampleDropdown.change(function(e) {
                // console.log('dropdown changed');
                currentPeptideListIndex = $(this).val();
                currentPeptideList = data[currentPeptideListIndex].list('peptides').more();

                // A potential change in the sample's state has occurred, call the stateFunction if there truly is one to reveal the change
                state.sample = data[currentPeptideListIndex];
                fireState(state, previousState);
                // previousState = clone(state);

                currentPeptideList = updatePeptides(currentPeptideList, displayDiv);
            });



            // resize (rebuild) peptide matrix when window is resized
            $(window).resize(function(e) {
                waitForFinalEvent(function() {
                    currentPeptideList = updatePeptides(currentPeptideList, displayDiv);
                }, 500, "bleh bleh bleh <-- unique ID :D :P");
            });


            // Attach peptide search to keypress event
            searchBox.keyup(function(e) {
                var searchString = $(this).val();
                // console.log(currentPeptideList);
                peptideSearch(searchString, currentPeptideList);
            });

            return currentPeptideList;
        };

        /**
         * Calculates the maximum number of columns for a list of peptides
         * @param Array peptideList The list of peptides assumed to be in matrix format
         */
        var maxCol = function(peptideList) {
            // console.log(peptideList);
            return peptideList.reduce(function(a, b) {
                if (a.pos.spot_col > b.pos.spot_col) {
                    return a;
                }
                return b;
            }).pos.spot_col;
        };

        /**
         * Displays the peptides in a matrix (this function actually creates the HTML)
         * @param Array peptideList The list of peptides to display
         * @param jQuery Object displayDiv The div to display the matrix in
         * @param Function findPeptides A callback function that distinguishes peptides found in a search and takes the peptide list and a search string
         */
        var displayPeptides = function(peptideList, displayDiv) {

            var $peptideMatrixLabel = $('<label id="peptide-picker-label">Peptide: </label>').append(pageStructure.gradientScale).appendTo(pageStructure.peptideMatrix),
                $peptideDisplay = $('<div id="peptide-list"></div>').appendTo(pageStructure.peptideMatrix),
                peptideRowWidth;

            // visible
            peptideRowWidth = pageStructure.peptideMatrixDummy.width();
            
            var $peptideDisplayRow,
                $cell,
                spotOpacity = 1,
                previousRow = 0,
                numCol = maxCol(peptideList),
                cellDimension = peptideRowWidth / numCol,
                spotDimension = cellDimension * 0.65,
                previousPeptideClicked,
                previousCellColor,
                previousInfo;

            peptideRowWidth = peptideRowWidth - 17;

            // console.log('Peptide Row Width: ' + peptideRowWidth);
            // console.log('Column width: ' + numCol);
            // console.log('Cell Dimension: ' + cellDimension);

            for (var i = 0; i < peptideList.length; i++) {
                var currentRow = peptideList[i].pos.spot_row;

                if (currentRow !== previousRow) {
                    $peptideDisplayRow = $('<div class="row-number-' + currentRow + '"></div>').appendTo($peptideDisplay);
                }

                $cell = createPeptideCell(peptideList[i], $peptideDisplayRow, cellDimension, spotDimension);
                createPopover($cell, peptideList[i]);

                if (peptideList[i].name === state.peptide) {
                    previousPeptideClicked = peptideList[i];
                    selectPeptide(peptideList[i], previousPeptideClicked, peptideList[i].defaultCellColor, false);
                }

                // Changes the peptide based on the one that was clicked
                (function(i) {
                    $cell.click(function(e) {
                        previousInfo = selectPeptide(peptideList[i], previousPeptideClicked, peptideList[i].defaultCellColor, true);

                        previousPeptideClicked = previousInfo[0];
                        previousCellColor = previousInfo[1];
                    });
                })(i);

                previousRow = currentRow;
            }

            createCycleExposureHtmlScaffold(state.sample);
            // console.log(state.peptide);
            if (state.peptide === null) {
                displaySampleData(state.sample);
            }

            // Maintain state if it exists
            peptideSearch($('#peptide-search').val(), peptideList);
            setPeptideColors();

            peptideMatrix = peptideList;
            return peptideList;
        };

        /**
         * Updates the peptide matrix display
         * Can be attached to events to allow display update 
         */
        var updatePeptides = function(peptideList, displayDiv) {
            pageStructure.peptideMatrix.empty();
            return displayPeptides(peptideList, displayDiv);
        };

        var createPeptideCell = function(peptide, location, cellDimension, spotDimension) {
            var $cell;

            peptide.defaultCellColor = '#e7e7e7';

            $cell = $('<span class="microarray-sample" style="width: ' + cellDimension +'px; height: ' + cellDimension + 'px; background-color: ' + peptide.defaultCellColor + '"><button style="width: ' + spotDimension + 'px; height: ' + spotDimension + 'px;"></button></span>')
                .appendTo(location);

            peptide.cell = $cell;

            peptide.changeSpotOpacity = function(opacity) {
                // console.log(this.cell);
                this.cell.children('button').css({opacity: opacity});
            };

            peptide.changeSpotColor = function(color) {
                this.cell.children('button').css({'background-color': color});
            };

            peptide.changeCellColor = function(color) {
                this.cell.css({"background-color": color});
            };

            return $cell;
        };

        var selectPeptide = function(peptide, previousPeptideClicked, previousCellColor, click) {
            if (previousPeptideClicked !== undefined) {
                previousPeptideClicked.changeCellColor(previousCellColor);
                }

            if (previousPeptideClicked && peptide.name === previousPeptideClicked.name && click) {
                state.peptide = null;
                fireState(state, previousState);
                // previousState = clone(state);

                displaySampleData(state.sample);
                previousCellColor = peptide.defaultCellColor;
                peptide = undefined;

            } else {
                displayPeptideData(peptide);

                
                previousCellColor = peptide.cell.css("background-color");
                peptide.changeCellColor('#6c6c93');
            }

            return [peptide, previousCellColor];
        };

        /**
         * Creates dynamic popovers for each of the microarray cells
         *  * Displays name
         *  * Dynamically adjusts position based on window width
         * @param jQuery Object popoverElement The element to add the popover to
         * @param Array popoverElement The array defining the properties of the peptide
         */
        var createPopover = function(popoverElement, peptide) {
            var displayDivId = pageStructure.container.attr('id'),
                windowWidth = window.innerWidth,
                toolTipContent = peptide.name,
                $dummy = $('<div class="tooltip">' + toolTipContent + '</div>').appendTo('body'),
                toolTipWidth = $dummy.width() + 20;

            $dummy.remove();

            popoverElement.popover({
                content: peptide.name,
                placement: function(popover, cell) {
                    var cellPosition = $(cell).offset().left + $(cell).width(),
                        remainingWindow = windowWidth - cellPosition - 45;

                    // console.log('windowWidth: ' + windowWidth);
                    // console.log('cellPosition: ' + cellPosition);
                    // console.log('remainingWindow: ' + remainingWindow);
                    // console.log('toolTipWidth: ' + toolTipWidth);
                    // console.log('toolTipContent: ' + toolTipContent);

                    if (toolTipWidth > remainingWindow) {
                        return 'left';
                    }

                    return 'right';
                },
                trigger: 'hover',
                html: true
            });
        };

        var retrievePeptideData = function(peptide, string) {
            var peptideData = {
                    name: peptide.name,
                    sequence: null,
                    phosph: {
                        aminoAcid: null,
                        pos: null
                    },
                    spotConc: null,
                    uniprot: null,
                    desc: null
                },
                peptideString = peptide.name;

            // Build peptide data object assuming no order to the array
            for (var i = 0; i < peptide.length; i++) {
                if (peptide[i].key.match(/sequence/i)) {
                    peptideData.sequence = peptide[i].value;
                    peptideString += peptide[i].value;

                } else if (peptide[i].key.match(/tyr/i)) {
                    try {
                        peptideData.phosph = {
                            aminoAcid: peptide[i].key,
                            pos: JSON.parse(peptide[i].value)
                        };
                    } catch (err) {
                        // console.error(err);
                        peptideData.phosph = {
                            aminoAcid: peptide[i].key,
                            pos: peptide[i].value
                        };
                    }

                    peptideString += peptide[i].key;
                    peptideString += peptide[i].value;

                } else if (peptide[i].key.match(/spotconcentration/i)) {
                    peptideData.spotConc = peptide[i].value;
                    peptideString += peptide[i].value;

                } else if (peptide[i].key.match(/uniprotaccession/i)) {
                    peptideData.uniprot = peptide[i].value;
                    peptideString += peptide[i].value;

                } else if (peptide[i].key.match(/description/i)) {
                    peptideData.desc = peptide[i].value;
                    // peptideString += peptide[i].value;
                }
            }

            return string
                ? peptideString
                : peptideData;
        };

        var highlightPhosphAminoAcids = function(peptideData, color) {
            if (Array.isArray(peptideData.phosph.pos)) {
                var position_array = peptideData.name.split('_'),
                    position_start = position_array[position_array.length - 2],
                    sequence = peptideData.sequence.split('');

                for (var i = 0; i < peptideData.phosph.pos.length; i++) {
                    var string_position = peptideData.phosph.pos[i] - position_start;
                    sequence[string_position] = '<span style="color: ' + color + '"><strong>' + sequence[string_position] + '</strong></span>';
                }

                peptideData.sequence = sequence.join('');

            } else {
                console.warn('Phosphorylation positions are not parsible');
            }
        }

        var displaySampleData = function(sample) {
            // Update the state of the system due to change in sample
            pageStructure.metaDataDisplay.empty();

            var $dataCol = $('<div id="sample-metadata"></div>').appendTo(pageStructure.metaDataDisplay),
                $dataColHeader = $('<h2 class="page-header">Sample Information</h2>').appendTo($dataCol),
                $infoRow = $('<div class="row"></div>').appendTo($dataCol),
                $leftCol = $('<div class="col-xs-6"></div>').appendTo($infoRow),
                $rightCol = $('<div class="col-xs-6"></div>').appendTo($infoRow),
                $currentCol;

            $('<h3>Level</h3>').appendTo($leftCol);
            $('<p>' + sample.level + '</p>').appendTo($leftCol);

            $('<h3>Barcode</h3>').appendTo($rightCol);
            $('<p>' + sample.name + '</p>').appendTo($rightCol);

            for (var i = 0; i < sample.sample_data.length; i++) {
                $currentCol = i % 2 === 0
                    ? $leftCol
                    : $rightCol;

                $('<h3>' + sample.sample_data[i].key + '</h3>').appendTo($currentCol);
                $('<p>' + sample.sample_data[i].value + '</p>').appendTo($currentCol);
            }

            $('<p class="lead alert alert-info text-center" style="margin-top: 20px">Pick a peptide to display its specific information</p>').appendTo($dataCol);
        };

        var displayPeptideData = function(peptide) {
            // Update the state of the system due to change in sample
            state.peptide = peptide.name;
            fireState(state, previousState);
            // previousState = clone(state);


            createCycleExposureHtmlScaffold(state.sample);

            // remove and re-create
            pageStructure.metaDataDisplay.empty();

            var peptideData = retrievePeptideData(peptide),
                $dataCol = $('<div class="metadata"></div>').appendTo(pageStructure.metaDataDisplay),
                $dataColHeader = $('<h2 class="page-header">Peptide Information</h2>').appendTo($dataCol),
                $infoRow = $('<div class="row"></div>').appendTo($dataCol),
                $leftCol = $('<div class="col-xs-6"></div>').appendTo($infoRow),
                $rightCol = $('<div class="col-xs-6"></div>').appendTo($infoRow);

            // Fix the sequence of highlighting the phosphorylated peptides
            highlightPhosphAminoAcids(peptideData, '#ffa500');

            // Display the data
            $('<h3>Name</h3>').appendTo($leftCol);
            $('<p>' + peptideData.name + '</p>').appendTo($leftCol);

            $('<h3>Sequence</h3>').appendTo($rightCol);
            $('<p>' + peptideData.sequence + '</p>').appendTo($rightCol);

            $('<h3>Phosphorylation</h3>').appendTo($leftCol);
            $('<p>Amino Acid: ' + peptideData.phosph.aminoAcid + '</p>').appendTo($leftCol);
            $('<p>Position: ' + peptideData.phosph.pos + '</p>').appendTo($leftCol);

            $('<h3>Spot Concentration</h3>').appendTo($rightCol);
            $('<p>' + peptideData.spotConc + '</p>').appendTo($rightCol);

            $('<h3>Uniprot Accession</h3>').appendTo($leftCol);
            $('<p><a href="http://uniprot.org/uniprot/' + peptideData.uniprot + '" target="_blank">' + peptideData.uniprot + '</a></p>').appendTo($leftCol);

            $('<h3>Description</h3>').appendTo($rightCol);
            $('<p>' + peptideData.desc.replace(/\([\s\S]+$/g, '') + '</p>').appendTo($rightCol);

            createDataTable(state.sample, state.peptide, state.cycle, state.exposure);
        };


        /**
         * Creates the bootstrap row for the cycle and exposure sliders and then loads the sliders in
         * @param 
         */
        var createCycleExposureHtmlScaffold = function(sample) {
            pageStructure.cycleExposureRow.empty();

            var $cycleCol = $('<div class="col-sm-6"></div>').appendTo(pageStructure.cycleExposureRow),
                $exposureCol = $('<div class="col-sm-6"></div>').appendTo(pageStructure.cycleExposureRow);

            loadSlider(sample, $cycleCol, 'cycle');
            loadSlider(sample, $exposureCol, 'exposure');

            $('#peptide-metadata').append();
        };

        /**
         * Loads in either the cycle slider of the exposure slider
         * @param Object sample The sample object containing the necessary information
         * @param jQuery Object location The jQuery DOM object for where to put the slider
         * @param String type The type of slider to build (cycle | exposure)
         */
        var loadSlider = function(sample, location, type) {
            var $header = $('<h2 class="page-header">' + capitalize(type) + '</h2>').appendTo(location),
                $sliderDiv = $('<div id="' + type + '-slider" class="sliders"></div>').appendTo(location),
                $slider = $('<input type="text" />'),
                data = sample.list(type),
                dataDefault = data.length - 1; // default for cycle that is reset in the loop if using exposures

            // save the state of the slider
            for (var i = 0; i < data.length; i++) {
                if (type === 'exposure' && state[type] === null && data[i] === 50) {
                    dataDefault = i;

                } else if (state[type] !== null && state[type] === data[i]) {
                    dataDefault = i;
                }
            }

            $slider.appendTo($sliderDiv);

            // update the state and reveal if there truly is a change
            state[type] = data[dataDefault];
            fireState(state, previousState);
            // previousState = clone(state);

            $slider.slider({
                value: dataDefault,
                min: 0,
                max: data.length - 1,
                tooltip_position: 'bottom',
                tooltip: 'always',
                formatter: function(value) {
                    return data[value];
                }
            }).on('slideStop', function(e) {
                state[type] = data[e.value];
                fireState(state, previousState);
                // setPeptideColors();
                createDataTable(state.sample, state.peptide, state.cycle, state.exposure);
            });
        };

        /**
         * Retrieves an image link for displaying in the peptide information section
         * @param Object sample A single sample object containing all information for the selected sample
         * @param string peptide The name of the peptide that is currently selected
         * @param int cycle The currently selected cycle
         * @param int exposure The currently select exposure
         * @return Link to the image
         */
        var getImageLink = function(sample, peptide, cycle, exposure) {
            // stores the object of a peptide from a sample at a specific cycle and exposure time
            var quadfecta = sample.get({peptide: peptide, cycle: cycle, exposure: exposure})[0];

            if (quadfecta !== undefined && quadfecta.image !== undefined) {
                return baseImgUrl + encodeURIComponent('"' + quadfecta.image +'"');
            
            } else {
                return undefined;
            }
        }

        var createImageButton = function(imageLink) {
            return $('<button class="btn btn-lg btn-primary" onclick="window.open(\'' + imageLink + '\')">Display Image</button>');
        }

        /**
         * Creates a data table for displaying information specific to sample, peptide, cycle, and exposure
         * @param Object sample A single sample object containing all information for the selected sample
         * @param string peptide The name of the peptide that is currently selected
         * @param int cycle The currently selected cycle
         * @param int exposure The currently select exposure
         * @return jQuery Object The jquery object that represents the table
         */
        var createDataTable = function(sample, peptide, cycle, exposure) {
            if (pageStructure.dataTable !== undefined) {
                pageStructure.dataTable.empty();
            }

            pageStructure.dataTable = $('<div>');

            if (!peptide) {
                return;
            }

            // stores the object of a peptide from a sample at a specific cycle and exposure time
            var quadfecta = sample.get({peptide: peptide, cycle: cycle, exposure: exposure})[0],
                $tableContainer = pageStructure.dataTable,
                imageLink = getImageLink(sample, peptide, cycle, exposure),
                $tableTitle,
                customRow,
                customRowLabel = [],
                customRowValue = [];

            // console.log(imageLink);

            if (imageLink !== undefined && quadfecta.image !== undefined) {
                $tableTitle = $('<h3 style="display: inline; vertical-align: middle">Data</h3>&nbsp;&nbsp;&nbsp;&nbsp;<p style="display: inline;">(Image: <a href="' + imageLink + '" target="_blank">' + quadfecta.image + '</a>)</p>');
            
            } else {
                $tableTitle = $('<h3 style="display: inline; vertical-align: middle">Data</h3>');
            }

            $tableTitle.appendTo($tableContainer);
            customRow = tableFunc(quadfecta);

            for (var i = 0; i < customRow.length; i++) {
                customRowLabel.push(customRow[i].key);
                customRowValue.push(customRow[i].value);
            }

            var $table = $('<table class="table table-condensed"></table>').appendTo($tableContainer),
                $tableHead = $('<thead></thead>').appendTo($table),
                $tableHeaders = $('<tr><th>Measurement</th><th>Value</th></tr>').appendTo($tableHead),
                $tableBody = $('<tbody>').appendTo($table),
                $backgroundDataRow = $('<tr><td>' + customRowLabel.join(', ') + '</td><td>' + customRowValue.join(', ') + '</td></tr>').appendTo($tableBody),
                $cycleDataRow;

                if (quadfecta) {
                    $cycleDataRow = $('<tr><td>Cycle, Exposure</td><td>' + quadfecta.cycle + ', ' + quadfecta.exposure + '</td></tr>').appendTo($tableBody);
                } else {
                    $cycleDataRow = $('<tr><td>Cycle, Exposure</td><td>' + cycle + ', ' + exposure + '</td></tr>').appendTo($tableBody);
                }

            $tableContainer.appendTo(pageStructure.metaDataDisplay);
        };

        displaySamples(data, state);
        return main;
    };

    exports.peptidePicker = display;

}(KINOME));


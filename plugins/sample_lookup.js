/**
 * http://bit.kinomecore.com/?siac_demo
 */

(function() {
    'use strict';

    var sampleLookupDiv = KINOME.addAnalysis('Sample Lookup'),
        SAMPLE_IDS = [
        {
            "PDX_ID": "JX12",
            "Kinomics_Sample name ()": "GBM ortho 12",
            "Affy_GBM-X ID": "GBM-X12P",
            "Affy_Sample ID": "JX12",
            "Illumina_ID": "10--12",
            "Illumina_SentrixPosition": "R03C01"
        },
        {
            "PDX_ID": "JX12TMZ",
            "Kinomics_Sample name ()": "GBM ortho 12TMZ",
            "Affy_GBM-X ID": "GBM-X12T",
            "Affy_Sample ID": "JX12TMZ",
            "Illumina_ID": "10--11",
            "Illumina_SentrixPosition": "R01C01"
        },
        {
            "PDX_ID": "JX39P",
            "Kinomics_Sample name ()": "GBM ortho 39P",
            "Affy_GBM-X ID": "GBM-X39P",
            "Affy_Sample ID": "JX39P",
            "Illumina_ID": "10--19",
            "Illumina_SentrixPosition": "R01C01"
        },
        {
            "PDX_ID": "JX14",
            "Kinomics_Sample name ()": "GBM ortho 14",
            "Affy_GBM-X ID": "GBM-X14P",
            "Affy_Sample ID": "JX14",
            "Illumina_ID": "10--17",
            "Illumina_SentrixPosition": "R04C01"
        },
        {
            "PDX_ID": "JX14TMZ",
            "Kinomics_Sample name ()": "GBM ortho 14TMZ",
            "Affy_GBM-X ID": "GBM-X14T",
            "Affy_Sample ID": "JX14TMZ",
            "Illumina_ID": "10--26",
            "Illumina_SentrixPosition": "R03C01"
        },
        {
            "PDX_ID": "JX22P",
            "Kinomics_Sample name ()": "GBM ortho 22P",
            "Affy_GBM-X ID": "GBM-X22P",
            "Affy_Sample ID": "JX22P",
            "Illumina_ID": "10--20",
            "Illumina_SentrixPosition": "R03C01"
        },
        {
            "PDX_ID": "JX59TMZ",
            "Kinomics_Sample name ()": "GBM ortho 59TMZ",
            "Affy_GBM-X ID": "GBM-X59T",
            "Affy_Sample ID": "JX59TMZ",
            "Illumina_ID": "10--23",
            "Illumina_SentrixPosition": "R04C01"
        },
        {
            "PDX_ID": "X1066",
            "Kinomics_Sample name ()": "GBM ortho X1066",
            "Affy_GBM-X ID": "GBM-X1066",
            "Affy_Sample ID": "X1066",
            "Illumina_ID": "10--25",
            "Illumina_SentrixPosition": "R01C01"
        },
        {
            "PDX_ID": "X1046",
            "Kinomics_Sample name ()": "GBM ortho X1046",
            "Affy_GBM-X ID": "GBM-X1046",
            "Affy_Sample ID": "X1046",
            "Illumina_ID": "10--22",
            "Illumina_SentrixPosition": "R02C01"
        },
        {
            "PDX_ID": "X1016",
            "Kinomics_Sample name ()": "GBM ortho X1016",
            "Affy_GBM-X ID": "GBM-X1016",
            "Affy_Sample ID": "X1016",
            "Illumina_ID": "10--29",
            "Illumina_SentrixPosition": "R04C01"
        },
        {
            "PDX_ID": "X1012",
            "Kinomics_Sample name ()": "X1012",
            "Affy_GBM-X ID": "GBM-X1012",
            "Affy_Sample ID": "X1012",
            "Illumina_ID": "10--27",
            "Illumina_SentrixPosition": "R02C01"
        },
        {
            "PDX_ID": "JX22T",
            "Kinomics_Sample name ()": "GBM ortho 22T",
            "Affy_GBM-X ID": "GBM-X22T",
            "Affy_Sample ID": "JX22T",
            "Illumina_ID": "10--32",
            "Illumina_SentrixPosition": "R01C01"
        },
        {
            "PDX_ID": "XD456",
            "Kinomics_Sample name ()": "GBM ortho XD456",
            "Affy_GBM-X ID": "GBM-X456",
            "Affy_Sample ID": "XD456",
            "Illumina_ID": "10--43",
            "Illumina_SentrixPosition": "R02C01"
        },
        {
            "PDX_ID": "JX59P",
            "Kinomics_Sample name ()": "GBM ortho 59P",
            "Affy_GBM-X ID": "GBM-X59P",
            "Affy_Sample ID": "JX59P",
            "Illumina_ID": "10--36",
            "Illumina_SentrixPosition": "R02C01"
        },
        {
            "PDX_ID": "JX6",
            "Kinomics_Sample name ()": "GBM ortho 6",
            "Affy_GBM-X ID": "GBM-X6",
            "Affy_Sample ID": "JX 6",
            "Illumina_ID": "10--42",
            "Illumina_SentrixPosition": "R03C01"
        },
        {
            "PDX_ID": "JX10",
            "Kinomics_Sample name ()": "GBM ortho 10",
            "Affy_GBM-X ID": "GBM-X10",
            "Affy_Sample ID": "JX10",
            "Illumina_ID": "10--38",
            "Illumina_SentrixPosition": "R04C01"
        },
        {
            "PDX_ID": "JX15",
            "Kinomics_Sample name ()": "GBM ortho 15",
            "Affy_GBM-X ID": "GBM-X15",
            "Affy_Sample ID": "JX 15",
            "Illumina_ID": "10--41",
            "Illumina_SentrixPosition": "R04C01"
        },
        {
            "PDX_ID": "X1011",
            "Kinomics_Sample name ()": "X1011",
            "Affy_GBM-X ID": "GBM-X1011",
            "Affy_Sample ID": "X1011",
            "Illumina_ID": "11--01",
            "Illumina_SentrixPosition": "R01C01"
        },
        {
            "PDX_ID": "X0948",
            "Kinomics_Sample name ()": "GBM ortho X0948",
            "Affy_GBM-X ID": "GBM-X0948",
            "Affy_Sample ID": "X0948",
            "Illumina_ID": "11--05",
            "Illumina_SentrixPosition": "R03C01"
        },
        {
            "PDX_ID": "X1006",
            "Kinomics_Sample name ()": "GBM ortho X1006",
            "Affy_GBM-X ID": "GBM-X1006",
            "Affy_Sample ID": "X1006",
            "Illumina_ID": "10--33",
            "Illumina_SentrixPosition": "R03C01"
        },
        {
            "PDX_ID": "XBT39",
            "Kinomics_Sample name ()": "GBM ortho XBT39",
            "Affy_GBM-X ID": "GBM-XBT39",
            "Affy_Sample ID": "XBT39",
            "Illumina_ID": "11--11",
            "Illumina_SentrixPosition": "R02C01"
        },
        {
            "PDX_ID": "X2354",
            "Kinomics_Sample name ()": "XHF2354",
            "Affy_GBM-X ID": "GBM-X2354",
            "Affy_Sample ID": "X2354"
        },
        {
            "PDX_ID": "HF2303",
            "Kinomics_Sample name ()": "HF2303",
            "Affy_GBM-X ID": "GBM-X2303",
            "Affy_Sample ID": "HF2303",
            "Illumina_ID": "10--45",
            "Illumina_SentrixPosition": "R04C01"
        },
        {
            "PDX_ID": "X2587",
            "Kinomics_Sample name ()": "XHF2587",
            "Affy_GBM-X ID": "GBM-X2587",
            "Affy_Sample ID": "X2587",
            "Illumina_ID": "11--12",
            "Illumina_SentrixPosition": "R04C01"
        },
        {
            "PDX_ID": "X2609",
            "Kinomics_Sample name ()": "XHF2609",
            "Affy_GBM-X ID": "GBM-X2609",
            "Affy_Sample ID": "X2609",
            "Illumina_ID": "11--13",
            "Illumina_SentrixPosition": "R01C01"
        },
        {
            "PDX_ID": "X1060",
            "Kinomics_Sample name ()": "X1060",
            "Affy_GBM-X ID": "GBM-X1060",
            "Affy_Sample ID": "X1060_A",
            "Illumina_ID": "11--14",
            "Illumina_SentrixPosition": "R03C01"
        },
        {
            "PDX_ID": "X1046",
            "Kinomics_Sample name ()": "HGBM-X1046",
            "Affy_GBM-X ID": "050501046",
            "Affy_Sample ID": "P1046-54",
            "Illumina_ID": "P1046-54",
            "Illumina_SentrixPosition": "R02C01"
        },
        {
            "PDX_ID": "X1066",
            "Kinomics_Sample name ()": "HGBM-X1066",
            "Affy_GBM-X ID": "050601066",
            "Affy_Sample ID": "P1066-1",
            "Illumina_SentrixPosition": "R02C01"
        },
        {
            "PDX_ID": "X1016",
            "Kinomics_Sample name ()": "HGBM-X1016",
            "Affy_GBM-X ID": "060201016",
            "Affy_Sample ID": "P1016-14",
            "Illumina_SentrixPosition": "R03C01"
        },
        {
            "PDX_ID": "X1011",
            "Kinomics_Sample name ()": "HGBM-X1011",
            "Affy_GBM-X ID": "090301011",
            "Affy_Sample ID": "P1011-04",
            "Illumina_SentrixPosition": "R01C01"
        },
        {
            "PDX_ID": "X0948",
            "Kinomics_Sample name ()": "HGBM-X0948",
            "Affy_GBM-X ID": "091201048",
            "Affy_Sample ID": "p0948",
            "Illumina_SentrixPosition": "R04C01"
        },
        {
            "PDX_ID": "X1006",
            "Kinomics_Sample name ()": "HGBM-X1006",
            "Affy_GBM-X ID": "100301006",
            "Affy_Sample ID": "P1006-4",
            "Illumina_SentrixPosition": "R02C01"
        },
        {
            "PDX_ID": "X1060",
            "Kinomics_Sample name ()": "HGBM-X1060",
            "Affy_GBM-X ID": "101201060",
            "Affy_Sample ID": "P1060-06",
            "Illumina_SentrixPosition": "R01C01"
        },
        {
            "PDX_ID": "X1033",
            "Affy_GBM-X ID": "080701033",
            "Affy_Sample ID": "1033",
            "Illumina_ID": "080701033-02",
            "Illumina_SentrixPosition": "R03C01"
        },
        {
            "PDX_ID": "P1048-09",
            "Affy_GBM-X ID": "081001048",
            "Affy_Sample ID": "P1048-09",
            "Illumina_SentrixPosition": "R04C01"
        },
        {
            "PDX_ID": "P1064-50",
            "Affy_GBM-X ID": "081201064",
            "Affy_Sample ID": "P1064-50",
            "Illumina_SentrixPosition": "R03C01"
        },
        {
            "PDX_ID": "P1009-13",
            "Affy_GBM-X ID": "090301009",
            "Affy_Sample ID": "P1009-13",
            "Illumina_SentrixPosition": "R04C01"
        },
        {
            "PDX_ID": "P0916-1",
            "Affy_GBM-X ID": "090501016",
            "Affy_Sample ID": "P0916-1",
            "Illumina_SentrixPosition": "R04C01"
        },
        {
            "PDX_ID": "P1031-1",
            "Affy_GBM-X ID": "090801031",
            "Affy_Sample ID": "P1031-1",
            "Illumina_SentrixPosition": "R02C01"
        },
        {
            "PDX_ID": "P1036-15",
            "Affy_GBM-X ID": "090901036",
            "Affy_Sample ID": "P1036-15",
            "Illumina_SentrixPosition": "R01C01"
        },
        {
            "PDX_ID": "P0946-9",
            "Affy_GBM-X ID": "091101046",
            "Affy_Sample ID": "P0946-9",
            "Illumina_SentrixPosition": "R01C01"
        },
        {
            "PDX_ID": "NB1034",
            "Kinomics_Sample name ()": "NB1034",
            "Affy_GBM-X ID": "110501034",
            "Affy_Sample ID": "P1034-13",
            "Illumina_SentrixPosition": "R04C01"
        },
        {
            "PDX_ID": "NB1046",
            "Kinomics_Sample name ()": "NB1046",
            "Affy_GBM-X ID": "110601046",
            "Affy_Sample ID": "P1046-12",
            "Illumina_SentrixPosition": "R01C01"
        },
        {
            "PDX_ID": "Unknown1",
            "Affy_GBM-X ID": "110702060",
            "Affy_Sample ID": "P2060-79",
            "Illumina_SentrixPosition": "R04C01"
        },
        {
            "PDX_ID": "Unknown2",
            "Affy_GBM-X ID": "110102004",
            "Affy_Sample ID": "2004",
            "Illumina_ID": "110102004-51",
            "Illumina_SentrixPosition": "R02C01"
        },
        {
            "PDX_ID": "NB1032",
            "Kinomics_Sample name ()": "NB1032-1",
            "Affy_GBM-X ID": "100801032",
            "Affy_Sample ID": "1032",
            "Illumina_ID": "100801032-18",
            "Illumina_SentrixPosition": "R01C01"
        },
        {
            "PDX_ID": "NMB",
            "Kinomics_Sample name ()": "Mouse Brain",
            "Affy_GBM-X ID": "M0001",
            "Affy_Sample ID": "NMB"
        },
        {
            "PDX_ID": "JX10",
            "Kinomics_Sample name ()": "GBM Xeno 10"
        },
        {
            "PDX_ID": "JX12",
            "Kinomics_Sample name ()": "GBM Xeno 12"
        },
        {
            "PDX_ID": "JX22P",
            "Kinomics_Sample name ()": "GBM Xeno 22"
        },
        {
            "PDX_ID": "JX6",
            "Kinomics_Sample name ()": "GBM Xeno 6"
        },
        {
            "PDX_ID": "X1016",
            "Kinomics_Sample name ()": "GBM Xeno X1016"
        },
        {
            "PDX_ID": "X1046",
            "Kinomics_Sample name ()": "GBM Xeno X1046"
        },
        {
            "PDX_ID": "X1066",
            "Kinomics_Sample name ()": "GBM Xeno X1066"
        },
        {
            "PDX_ID": "XD456",
            "Kinomics_Sample name ()": "GBM Xeno XD456"
        },
        {
            "PDX_ID": "X1440",
            "Kinomics_Sample name ()": "GBM Xeno X1440"
        },
        {
            "PDX_ID": "X1052",
            "Kinomics_Sample name ()": "GBM Xeno X1052"
        },
        {
            "PDX_ID": "X1238",
            "Kinomics_Sample name ()": "GBM Xeno X1238"
        },
        {
            "PDX_ID": "X1516",
            "Kinomics_Sample name ()": "GBM Xeno X1516"
        },
        {
            "PDX_ID": "X1154",
            "Kinomics_Sample name ()": "GBM Xeno X1154"
        },
        {
            "PDX_ID": "X1465",
            "Kinomics_Sample name ()": "GBM Xeno X1465"
        },
        {
            "PDX_ID": "X1429",
            "Kinomics_Sample name ()": "GBM Xeno X1429"
        },
        {
            "PDX_ID": "X1524",
            "Kinomics_Sample name ()": "GBM Xeno X1524"
        },
        {
            "PDX_ID": "X1153",
            "Kinomics_Sample name ()": "GBM Xeno X1153"
        },
        {
            "PDX_ID": "JX39TMZ",
            "Kinomics_Sample name ()": "GBM ortho 39TMZ"
        }
    ];

    /**
     * Determines if a value (needle) is in an array (haystack)
     * @param {Any} needle Value to locate in array
     * @param {Array} haystack Array to attempt to find value in
     * @return {Boolean} True if found, False if not found
     */
    var inArray = function(needle, haystack) {
        for (var i = 0; i < haystack.length; i++) {
            if (needle.toLowerCase() === haystack[i].toLowerCase()) {
                return true;
            }
        }

        return false;
    }

    /**
     * Gets all unique PDX IDs from samples
     * @param {Array} samples All samples to acquire unique IDs from
     * @return {Array} Array of unique PDX IDs
     */
    var getAllPdxIds = function(samples) {
        var pdxIds = [];
        for (var i = 0; i < samples.length; i++) {
            if (! inArray(samples[i].PDX_ID, pdxIds)) {
                pdxIds.push(samples[i].PDX_ID);
            }
        }
        return pdxIds.sort();
    }
    
    /**
     * Finds all samples with a specific PDX ID
     * @param {String} pdxId The PDX_ID to find
     * @param {Array} samples List of samples
     * @return {Array} Array of the redundant PDX samples
     */
    var findPdxSamples = function(pdxId, samples) {
        var pdxSamples = [];

        for (var i = 0; i < samples.length; i++) {
            if (samples[i].PDX_ID.toLowerCase() === pdxId.toLowerCase()) {
                pdxSamples.push(samples[i]);
            }
        }

        return pdxSamples;
    };
    
    /**
     * Compress all redundant samples into one object listing multiple values for an attribute in an array under the same attribute
     * @param {Array} pdxSamples Array of redundant pdx Samples
     * @return {Object} Object listing the multiple IDs of the PDX samples
     */
    var compressPdxSamples = function(pdxSamples) {
        var pdxSample = {},
            keys;
        if (pdxSamples.length === 1) {
            return pdxSamples[0];
        } else {
            // redundant samples listed with same PDX_ID, go through each one
            for (var i = 0; i < pdxSamples.length; i++) {
                let currentSample = pdxSamples[i],
                    keys = Object.keys(currentSample);
                
                // go through each key (attribute) in the object and check if it has already been set from one of the previous redundantly listed samples
                // if not, set it
                // if it has been set, either create array and add both values for the attribute to the array
                // or, keep adding to the array
                for (var j = 0; j < keys.length; j++) {
                    let key = keys[j];
                    if (! pdxSample[key]) {
                        pdxSample[key] = currentSample[key];
                    } else if (Array.isArray(pdxSample[key])) {
                        pdxSample[key].push(currentSample[key]);
                    // don't need a redundant key
                    } else if (key !== "PDX_ID") {
                        let temp = pdxSample[key];
                        pdxSample[key] = [];
                        pdxSample[key].push(temp);
                        pdxSample[key].push(currentSample[key]);
                    }
                }
            }

            return pdxSample;
        }
    };

    /**
     * Creates the dropdown for selecting a PDX ID
     * @param {Array} pdxIds Array of unique PDX IDs
     * @return {jQuery DOM Object} The div containing the dropdown
     */
    var createPdxDropDown = function(pdxIds) {
        var $dropDownDiv = $('<div class="form-group"></div>'),
            $dropDown = $('<select class="form-control"></select>');

        $dropDownDiv.append($('<label>PDX_ID</label>'));
        $dropDownDiv.append($dropDown);

        for (var i = 0; i < pdxIds.length; i++) {
            $dropDown.append($('<option value="' + pdxIds[i] +'">' + pdxIds[i] + '</option>'));
        }

        return $dropDownDiv;
    };

    /**
     * 
     * @param {String} pdxId The PDX_ID to display the all IDs and associated data
     */
    var displayAllIds = function(pdxId) {
        var $div = $('<div>'),
            $idList = $('<ul>'),
            redundantPdxSamples,
            compressedPdxSample,
            keys;

        redundantPdxSamples = findPdxSamples(pdxId, SAMPLE_IDS);
        compressedPdxSample = compressPdxSamples(redundantPdxSamples);

        $div
            .append($('<hr />'))
            .append($idList);

        // iterate through all the IDs for the sample and create a list with the name of the ID
        keys = Object.keys(compressedPdxSample);
        for (var i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (! Array.isArray(compressedPdxSample[key])) {
                let listItemHtml = '<strong>' + key + '</strong>: ' + compressedPdxSample[key],
                    $listItem = $('<li>' + listItemHtml + '</li>');

                $idList.append($listItem);
                
                if (key === "Kinomics_Sample name ()") {
                    addKinomeLink($listItem, compressedPdxSample[key]);
                }

            } else {
                let $listItem = $('<li></li>');
                let $subList = $('<ul></ul>');

                // add list item the will contain a sublist at this point
                $idList.append($listItem);
                $listItem
                    .append($('<strong>' + key + '</strong>'))
                    .append($subList);
                
                // fill in sublist
                for (var j = 0; j < compressedPdxSample[key].length; j++) {
                    let value = compressedPdxSample[key][j],
                        $listItem = $('<li>' + value + '</li>');

                    $subList.append($listItem);
                    if (key === "Kinomics_Sample name ()") {
                        addKinomeLink($listItem, value);
                    }
                }
            }
        }

        return $div;
    };

    /**
     * Adds the kinome link to the level 1.1.2 data to the kinome sample name by first checking if there is data
     * @param {*} element The element to add the link to
     * @param {*} kinomeName The kinome sample name to retrieve the data from the API
     */
    var addKinomeLink = function(element, kinomeName) {
        $.getJSON('http://db.kinomecore.com/1.0.0/name?find=' +encodeURIComponent('{"sample_data":{"$elemMatch":{"value":"' + kinomeName + '"}}}') + '&fields=' +encodeURIComponent( '{"_id":1}'), function(data) {
        // $.getJSON('http://db.kinomecore.com/1.0.0/lvl_1.1.2?find=' + encodeURIComponent('{"sample_data":{"$elemMatch":{"value":"' + kinomeName + '"}}}'), function(data) {
            console.log(data);
            if (data.length > 0) {
                element.html(element.html() + 
                    ' <a href="http://mischiefmanaged.tk/?data=*[http://db.kinomecore.com/1.0.0/lvl_1.1.2?find=' +
                    encodeURIComponent('{"sample_data":{"$elemMatch":{"value":"' + kinomeName + '"}}}') +
                    ']*">Search Kinome Database</a>');
            }
        });
    }

    var createPage = function($pageDiv, samples) {
        var $pdxDropdownDiv,
            $idDiv = $('<div>'),
            pdxIds;

        pdxIds = getAllPdxIds(samples);
        $pdxDropdownDiv = createPdxDropDown(pdxIds);

        $pageDiv
            .append('<h1>Sample Lookup</h1>')
            .append($pdxDropdownDiv)
            .append($idDiv);

        $idDiv.append(displayAllIds(pdxIds[0]));

        $pdxDropdownDiv.children().change(function() {
            $idDiv.empty();
            $idDiv.append(displayAllIds(this.value));
        });
    };

    createPage(sampleLookupDiv, SAMPLE_IDS);
}());
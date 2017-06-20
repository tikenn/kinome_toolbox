/**
 * Peptide Level 1 Display
 * Copyright 2017 Tim Kennell Jr.
 * Licensed under the MIT License (http://opensource.org/licenses/MIT)
 **
 * Calls the level 1 display function that creates displays for all level 1 data
 **
 * Dependencies:
 *  * peptide picker
 */

requires = [require('level_1_display')];

Promise.all(requires).then(function() {
    KINOME.list('levels').map(function(lvl) {
        var data = KINOME.get({level: lvl}),
            div;

        if (data.length) {
            div = KINOME.addAnalysis('Level ' + lvl + ' Visualize');
            div.append(KINOME.levelOneDisplay(data));
        }
    });
});
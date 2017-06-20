/**
 * Calls the level 1 display file and runs it
 */

requires = [require('level_1_display')];

Promise.all(requires).then(function() {
    KINOME.list('levels').map(function(lvl) {
        var data = KINOME.get({level: lvl}),
            div;

        if (data.length) {
            div = KINOME.addAnalysis('Level ' + lvl + ' Visualize');
            div.append(buildTab(data));
        }
    });
});
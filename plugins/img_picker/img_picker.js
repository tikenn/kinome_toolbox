/**
 * Image Picker
 * Copyright 2017 Tim Kennell Jr.
 * Licensed under the MIT License (http://opensource.org/licenses/MIT)
 **
 * Allows selection of samples, cycles, and exposures
 **
 * Dependencies
 *  * Bootstrap Slider (http://seiyria.com/bootstrap-slider/)
 */

(function(exports) {
    'use strict';

    var requires = [require('bs_slider-js')];
    require('bs_slider-css');

    var defaultStateFunc = function(state) { /*console.log(state);*/ };

    /**
     * Capitalizes the first letter of a string
     * @param String string The string to capitalize the first letter of
     * @return String The string with the first letter capitalized
     */
    var capitalize = function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    /**
     * Deep copies an object and returns it
     * @param Object object The object to deep copy
     * @return Object The deep copy of the object
     */
    var clone = function(object) {
        return {
            name: object.name,
            sample: object.sample.clone(),
            exposure: object.exposure,
            cycle: object.cycle
        };
    };


    var buildSlider = function (thisDiv, arr, setVal, update, type) {
        var retDiv, i, title;
        for (i = 0; i < arr.length; i += 1) {
            if (arr[i] === setVal) {
                setVal = i;
                break;
            }
        }
        title = $('<h2>' + capitalize(type) + '</h2>');
        retDiv = $('<input type="text" />');
        thisDiv.append(title).append($('<div>', {class: 'center-block', style: 'width:90%'}).append(retDiv));
        retDiv.slider({
            value: setVal,
            min: 0,
            max: arr.length - 1,
            tooltip_position: 'bottom',
            tooltip: 'always',
            formatter: function (value) {
                return arr[value];
            }
        }).on('slideStop', function (e) {
            update(type, arr[e.value]);
        });
        return retDiv;
    };

    var displayData = function (data) {
        // var options = {};
        var i,
            samps = data.list('names'),
            selected = {
                name: null,
                sample: null,
                exposure: 50,
                cycle: 'Post Wash'
            },
            buildPageParts,
            update,
            cycleDisabled = false,
            exposureDisable = false,
            $page_build = {},
            main = {},
            stateFunction = defaultStateFunc;
        
        $page_build.div = $('<div>');

        main.div = $page_build.div;
        main.change = function(customStateFunc) {
            if (typeof customStateFunc === 'function') {
                stateFunction = customStateFunc;
                stateFunction(clone(selected));

            } else {
                console.error('The change function requires a function, not this', customStateFunc);
            }
        };

        main.disableSample = function () {
            $page_build.samp_dropdown.prop('disabled', true);
        };

        main.disableExposure = function () {
            $page_build.exposureSlider.slider("disable");
            $page_build.exposurePicker.find('.tooltip').hide();
            exposureDisable = true;
        };

        main.disableCycle = function () {
            $page_build.cycleSlider.slider("disable");
            $page_build.cyclePicker.find('.tooltip').hide();
            cycleDisabled = true;
        };

        buildPageParts = function () {
            $page_build.cyclePicker.empty();
            $page_build.exposurePicker.empty();
            $page_build.cycleSlider = buildSlider($page_build.cyclePicker, selected.sample.list('cycle'), selected.cycle, update, 'cycle');
            $page_build.exposureSlider = buildSlider($page_build.exposurePicker, selected.sample.list('exposure'), selected.exposure, update, 'exposure');
            if (cycleDisabled) {
                main.disableCycle();
            }
            if (exposureDisable) {
                main.disableExposure();
            }
        };

        //cycle picker
        update = function (key, value) {
            var j, c;
            if (selected[key] !== value) {
                selected[key] = value;
                if (key === 'name') {
                    selected.sample = data.get({name: value, get_samples: true})[0];
                    buildPageParts();
                }

                stateFunction(clone(selected));
            }
        };

        $page_build.img_picker = $('<div>', {class: 'row'});

        //sample picker
        $page_build.samp_picker = $('<div>');
        $('<h2>Sample</h2>').appendTo($page_build.samp_picker);
        $page_build.samp_dropdown = $('<select>', {class: 'form-control'}).appendTo($page_build.samp_picker);

        for (i = 0; i < samps.length; i += 1) {
            $page_build.samp_dropdown.append('<option value="' + samps[i] + '" >' + samps[i] + '</option>');
        }
        $page_build.samp_picker.appendTo($('<div>', {class: 'col-sm-4 col-xs-12'}).appendTo($page_build.img_picker));
        $page_build.samp_dropdown.change(function (evt) {
            update('name', $(this).val());
        });

        //set up for slide bars
        $page_build.cyclePicker = $('<div>', {class: 'col-sm-4 col-xs-12'}).appendTo($page_build.img_picker);
        $page_build.exposurePicker = $('<div>', {class: 'col-sm-4 col-xs-12'}).appendTo($page_build.img_picker);

        //Add it to the page
        $page_build.img_picker.appendTo($page_build.div);

        update('name', samps[0]);

        return main;
    };

    exports.imagePicker = displayData;

    // var data1 = KINOME.get({level: '1.0.1'});
    // Promise.all(requires).then(function() {
    //     KINOME.addAnalysis('image_picker').append(exports.imagePicker(data1));
    // });

}(KINOME));


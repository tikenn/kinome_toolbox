/*global amd_ww, KINOME module google Blob jQuery save ID $ window*/
(function (exports) {
    "use strict";
    /*
        The point of this is to run the quality filtration package. We will
        see how it goes.
    */
    var $page_build = {}, buildSlider, buildPage, requires, normalize_background_worker, startFits, displayData;

    normalize_background_worker = "./js/lib/normalize_background_worker.min.js";
    // equationURL = "./models/cyclingEq_3p_hyperbolic.jseq";

    requires = [require('amd_ww'), require('enrich_kinome'), require('normalize_background'), require('bs_slider-js')];
    require('bs_slider-css');

    buildPage = function (data, div) {
        div.append('<div>This script normalizes all of the level 1.0.1 image backgrounds utilizing multiple linear regression. Once you start the fitting, a loading bar will appear and you will be able to investigate before and after of the normalization on an image by image basis.<div>');
        $('<button>', {style: "margin: 15px;", class: "btn btn-primary btn-lg", text: "Begin Correction."}).click(startFits(data, div)).appendTo($('<div>', {class: 'text-center'}).appendTo(div));
    };

    startFits = function (data, div) {
        return function (evt) {
            evt.preventDefault();
            var barBuilder, normalizePromise;

            barBuilder = function (msg) {
                div.append('<div>', {text: msg});
                var bar = $('<div>', {
                    class: "progress-bar",
                    role: "progressbar",
                    'aria-valuenow': "0",
                    "aria-valuemin": "0",
                    "aria-valuemax": "100",
                    style: "width: 0%"
                }).appendTo($('<div class="progress"></div>').appendTo(div));
                return function (counts) {
                    var interval, percent;
                    interval = setInterval(function () {
                        if (counts.done === counts.total) {
                            clearInterval(interval);
                        }
                        percent = counts.done / counts.total * 100;
                        percent = percent.toFixed(2);
                        bar.attr('aria-valuenow', percent);
                        bar.attr('style', "width: " + percent + "%");
                        bar.text(percent + "%");
                    }, 100);
                };
            };

            normalizePromise = KINOME.normalize_background({
                data: data,
                amd_ww: amd_ww,
                worker: normalize_background_worker,
                number_threads: 4,
                update: barBuilder('Normalizing')
            });

            normalizePromise.then(function (data_out) {
                displayData(data, KINOME.enrich(data_out), div);
                // console.log('all fit?', data);
            });
        };
    };

    buildSlider = function (thisDiv, arr, setVal, update, type) {
        var retDiv, i;
        for (i = 0; i < arr.length; i += 1) {
            if (arr[i] === setVal) {
                setVal = i;
                break;
            }
        }
        retDiv = $('<input type="text" />');
        thisDiv.append($('<div>', {class: 'center-block', style: 'width:90%'}).append(retDiv));
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

    displayData = function (data_in, data_out, div) {
        // var options = {};
        var i, samps = data_in.list('names'), selected = {}, buildPageParts, update, buildImage;

        buildPageParts = function () {
            $page_build.cyclePicker.empty();
            $page_build.exposurePicker.empty();
            buildSlider($page_build.cyclePicker, selected.sample[0].list('cycle'), selected.cycle, update, 'cycle');
            buildSlider($page_build.exposurePicker, selected.sample[0].list('exposure'), selected.exposure, update, 'exposure');
            buildImage();
        };

        buildImage = function () {
            console.log(selected);
            console.log('building');
        };

        //cycle picker
        update = function (key, value) {
            var j, c;
            if (selected[key] !== value) {
                selected[key] = value;
                if (key === 'name') {
                    selected.sample = [];
                    c = 0;
                    for (j = 0; c < 2 && j < data_in.length; j += 1) {
                        if (data_in[j].name === value) {
                            selected.sample[0] = data_in[j];
                            c += 1;
                        }
                        if (data_out[j].name === value) {
                            selected.sample[1] = data_in[j];
                            c += 1;
                        }
                    }
                    buildPageParts();
                } else {
                    buildImage();
                }
            }
        };


        //default values
        selected = {
            exposure: 50,
            cycle: 'Post Wash'
        };

        $page_build.img_picker = $('<div>', {class: 'row'});

        //sample picker
        $page_build.samp_picker = $('<select>', {class: 'form-control'});
        for (i = 0; i < samps.length; i += 1) {
            $page_build.samp_picker.append('<option value="' + samps[i] + '" >' + samps[i] + '</option>');
        }
        $page_build.samp_picker.appendTo($('<div>', {class: 'col-sm-4 col-xs-12'}).appendTo($page_build.img_picker));
        $page_build.samp_picker.change(function (evt) {
            console.log(evt);
        });

        //set up for slide bars
        $page_build.cyclePicker = $('<div>', {class: 'col-sm-4 col-xs-12'}).appendTo($page_build.img_picker);
        $page_build.exposurePicker = $('<div>', {class: 'col-sm-4 col-xs-12'}).appendTo($page_build.img_picker);

        //Add it to the page
        $page_build.img_picker.appendTo(div);

        //result
        $page_build.titleIn = $('<h2>', {text: 'Background In'});
        $page_build.titleOut = $('<h2>', {text: 'Background Out'});

        //set up region for canvases
        $page_build.canvasIn = $('<div>');
        $page_build.canvasOut = $('<div>');

        //set up region for google plots
        $page_build.gplot1 = $('<div>');
        $page_build.gplot2 = $('<div>');

        $('<div>', {class: 'row'})
            .append(
                $('<div>', {class: 'col-xs-12 col-sm-6'})
                    .append($page_build.titleIn)
                    .append($page_build.canvasIn)
                    .append($page_build.gplot1)
            ).append(
                $('<div>', {class: 'col-xs-12 col-sm-6'})
                    .append($page_build.titleOut)
                    .append($page_build.canvasOut)
                    .append($page_build.gplot2)
            ).appendTo(div);

        update('name', data_in[0].name);

        return [data_in, data_out];
    };

    //Finally get things started
    //get stuff building

    (function () {
        //Now require scripts then get going.
        Promise.all(requires).then(function () {
            var samples = KINOME.get({level: '1.0.1'});
            if (samples.length) {
                buildPage(samples, KINOME.addAnalysis('Normalize Background'));
            }
        });
    }());

    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
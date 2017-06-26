/*global amd_ww, KINOME module google Blob jQuery save ID $ window*/
(function (exports) {
    "use strict";
    /*
        The point of this is to run the quality filtration package. We will
        see how it goes.
    */
    var $page_build = {}, capitalize, createGradient, buildCanvas, buildSlider, getPlotPnts, buildPage, requires, normalize_background_worker, startFits, displayData;

    normalize_background_worker = "./js/lib/normalize_background_worker.min.js";
    // equationURL = "./models/cyclingEq_3p_hyperbolic.jseq";

    requires = [require('amd_ww'), require('gradient'), require('enrich_kinome'), require('normalize_background'), require('bs_slider-js')];
    require('bs_slider-css');

    buildPage = function (data, div) {
        div.append('<div>This script normalizes all of the level 1.0.1 image backgrounds utilizing multiple linear regression. Once you start the fitting, a loading bar will appear and you will be able to investigate before and after of the normalization on an image by image basis.<div>');
        $('<button>', {style: "margin: 15px;", class: "btn btn-primary btn-lg", text: "Begin Correction."}).click(function (evt) {
            $(this).unbind('click');
            startFits(data, div)(evt);
        }).appendTo($('<div>', {class: 'text-center'}).appendTo(div));
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

    capitalize = function (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    };


    buildSlider = function (thisDiv, arr, setVal, update, type) {
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

    buildCanvas = function (data, min_back, max_back) {
        var sqr_width = $page_build.width.width(),
            canvas = document.createElement('canvas'),
            ctx,
            i,
            scale = 0.8,
            r_max = 0,
            c_max = 0,
            sqr_dim;

        for (i = 0; i < data.length; i += 1) {
            r_max = Math.max(data[i].spot_row, r_max); //indexed from 1
            c_max = Math.max(data[i].spot_col, c_max); //indexed from 1
        }

        canvas.width = sqr_width * scale; // 80% of the column
        canvas.height = sqr_width * r_max / c_max * scale;
        sqr_dim = sqr_width / c_max * scale;

        ctx = canvas.getContext('2d');
        for (i = 0; i < data.length; i += 1) {
            // console.log((data[i].background - min_back) / (max_back - min_back));
            ctx.fillStyle = createGradient((data[i].background - min_back) / (max_back - min_back));
            ctx.fillRect(
                sqr_dim * (data[i].spot_col - 1),
                sqr_dim * (data[i].spot_row - 1),
                sqr_dim,
                sqr_dim
            );
        }

        return $(canvas).css({width: "70%", 'margin-top': '15px'});
    };


    displayData = function (data_in, data_out, div) {
        // var options = {};
        var i, buildChart, samps = data_in.list('names'), selected = {}, buildPageParts, update, buildImage;

        $page_build.width = $('<div>', {class: 'col col-sm-6 col-xs-12'});
        $page_build.width.appendTo($('<div>', {class: 'row'})
            .appendTo($("<div>", {class: 'container', style: "height:0px;visibility: hidden;"})
                .appendTo('body')));

        buildPageParts = function () {
            $page_build.cyclePicker.empty();
            $page_build.exposurePicker.empty();
            buildSlider($page_build.cyclePicker, selected.sample[0].list('cycle'), selected.cycle, update, 'cycle');
            buildSlider($page_build.exposurePicker, selected.sample[0].list('exposure'), selected.exposure, update, 'exposure');
            buildImage();
        };

        getPlotPnts = function (arr) {
            var ii, ret = [['signal', 'background', {type: 'string', role: 'tooltip'}]];
            for (ii = 0; ii < arr.length; ii += 1) {
                ret.push([
                    arr[ii].signal, arr[ii].background,
                    "(" + arr[ii].signal.toFixed(1) + ', ' +
                            arr[ii].background.toFixed(1) + ')\nPeptide: '
                            + arr[ii].peptide
                ]);
            }
            return ret;
        };

        buildImage = function () {
            var inSamp = selected.sample[0].get(selected);
            var outSamp = selected.sample[1].get(selected);
            var getObj = {exposure: selected.exposure};

            $page_build.canvasIn.empty();
            $page_build.canvasOut.empty();
            $page_build.gplot1.empty();
            $page_build.gplot2.empty();

            //find max and min backgrounds
            var maxBack = -Infinity, minBack = Infinity;
            if (selected.cycle === 'Post Wash') {
                getObj.cycle = 'Post Wash';
            }
            data_in.get(getObj).map(function (x) {
                maxBack = Math.max(x.background, maxBack);
                minBack = Math.min(x.background, minBack);
            });
            data_out.get(getObj).map(function (x) {
                maxBack = Math.max(x.background, maxBack);
                minBack = Math.min(x.background, minBack);
            });

            buildCanvas(inSamp, minBack, maxBack).appendTo($page_build.canvasIn);
            buildCanvas(outSamp, minBack, maxBack).appendTo($page_build.canvasOut);

            // console.log(inSamp);

            buildChart(getPlotPnts(inSamp), "In", $page_build.gplot1[0]);
            buildChart(getPlotPnts(outSamp), "Out", $page_build.gplot2[0]);

            return [inSamp, outSamp];
        };

        buildChart = function (pnts, type, thisDiv) {
            // console.log(pnts);
            var dataTable = google.visualization.arrayToDataTable(pnts);
            var options = {
                title: 'Signal v Background ' + type,
                titleTextStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', bold: false, fontSize: '24'},
                hAxis: {title: 'Signal', titleTextStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '20', bold: false}, textStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '14'}},
                vAxis: {title: 'Background', titleTextStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '20', bold: false}, textStyle: {fontName: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '14'}},

                //for publication
                // hAxis: {title: 'Signal', titleTextStyle: {fontName: 'Arial', fontSize: '12', bold: false}, textStyle: {fontName: 'Arial', fontSize: '10', bold: false}},
                // vAxis: {title: 'Background', titleTextStyle: {fontName: 'Arial', fontSize: '12', bold: false}, textStyle: {fontName: 'Arial', fontSize: '10', bold: false}},
                // height: 400,
                // width: 400,

                legend: 'none',
                // tooltip: {isHtml: true, trigger: 'both'},
                seriesType: 'scatter',
                series: {'4': {color: '#e2431e', type: 'line', enableInteractivity: false}},
                height: $page_build.width.width(),
                width: $page_build.width.width()
            };

            var chart = new google.visualization.ComboChart(thisDiv);

            google.visualization.events.addListener(chart, 'ready', function () {
                $.each($('text'), function (index, label) {
                    var labelText = $(label).text();
                    if (labelText.match(/_|\^/)) {
                        labelText = labelText.replace(/_([^\{])|_\{([^\}]*)\}/g, '<tspan style="font-size: smaller;" baseline-shift="sub">$1$2</tspan>');
                        labelText = labelText.replace(/\^([^\{])|\^\{([^\}]*)\}/g, '<tspan style="font-size: smaller;" baseline-shift="super">$1$2</tspan>');
                        $(label).html(labelText);
                    }
                    return index; //shut up jslint
                });
            });

            chart.draw(dataTable, options);
            // $page_obj[type].f_val.text("f-test = " + f_stat(pnts.stats).toFixed(5));
        };

        //cycle picker
        update = function (key, value) {
            if (selected[key] !== value) {
                selected[key] = value;
                if (key === 'name') {
                    selected.sample = [
                        data_in.get({name: value, get_samples: true})[0],
                        data_out.get({name: value, get_samples: true})[0]
                    ];
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
        $page_build.samp_picker = $('<div>');
        $('<h2>Sample</h2>').appendTo($page_build.samp_picker);
        $page_build.samp_dropdown = $('<select>', {class: 'form-control'}).appendTo($page_build.samp_picker);

        for (i = 0; i < samps.length; i += 1) {
            $page_build.samp_dropdown.append('<option value="' + samps[i] + '" >' + samps[i] + '</option>');
        }
        $page_build.samp_picker.appendTo($('<div>', {class: 'col-sm-4 col-xs-12'}).appendTo($page_build.img_picker));
        $page_build.samp_dropdown.change(function () {
            update('name', $(this).val());
        });

        //set up for slide bars
        $page_build.cyclePicker = $('<div>', {class: 'col-sm-4 col-xs-12'}).appendTo($page_build.img_picker);
        $page_build.exposurePicker = $('<div>', {class: 'col-sm-4 col-xs-12'}).appendTo($page_build.img_picker);

        //Add it to the page
        $page_build.img_picker.appendTo(div);

        //result
        $page_build.titleIn = $('<h2>', {style: 'margin-top:40px;', class: 'page-header', text: 'Background In'});
        $page_build.titleOut = $('<h2>', {style: 'margin-top:40px;', class: 'page-header', text: 'Background Out'});

        //set up region for canvases
        $page_build.canvasIn = $('<div>', {class: 'center-block text-center'});
        $page_build.canvasOut = $('<div>', {class: 'center-block text-center'});

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
            createGradient = KINOME.gradient.convert;
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
/*global Worker,convert $*/

(function () {
    //Simple function just loads in the image from the url and builds a scaffolding
        //to show the row column direction.
    'use strict';
    //http://localhost:7000/kinome_toolbox/image/?img=%22631308613_W1_F1_T200_P154_I1313_A30.tif%22

    var spread, getParameter, gethsl, getrgb,
            baseURL = 'http://db.kinomecore.com/img/kinome/';

    spread = function (imData) {
        //capture lightness array
        var range, uniqueL, i, j = 0, lightness = {}, hslPnts = [], hsl,
                out = {}, rgb, data = imData.data;
        console.log("spread");
        for (i = 0; i < data.length; i += 4) {
            hsl = gethsl(data.slice(i, i + 3));
            lightness[hsl[2]] = lightness[hsl[2]] || 0;
            lightness[hsl[2]] += 1;
            hslPnts.push(hsl);
        }
        uniqueL = Object.keys(lightness);
        range = Math.max(uniqueL.length, 18) + 3; //Maximum number of diff
                                //values found was only 16.
        for (i = 0; i < range + 1; i += 1) {
            out[uniqueL[i]] = Math.log(((i + 3) / range) * (Math.E - 1) + 1) * 100;
        }
        for (i = 0; i < data.length; i += 4) {
            hsl = hslPnts[j];
            j += 1;
            hsl[2] = out[hsl[2]];
            rgb = getrgb(hsl);
            data[i] = rgb[0];
            data[i + 1] = rgb[1];
            data[i + 2] = rgb[2];
        }
        return imData;
    };

    getParameter = function (name) {
        var url = decodeURIComponent(location.href), regex, match, matches = [];

        //Deal with open close brackets in name
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");

        //Find the part of interest
        regex = new RegExp("(?:[\\?&]" + name + "=\")([^\"]*)\"", 'g');

        //actually find the regex stuff
        match = regex.exec(url);
        while (match) {
            matches.push(match[1]);
            match = regex.exec(url);
        }

        console.log(name, matches, url);

        return matches;
    };

    var img = getParameter('img');
    if (img.length === 0) {
        $('#main_page').empty().append('<div class="alert alert-warning"><h2>No image provide, add a file name with: <code>?img="<imgName>"</code>.</h2></div>');
        return;
    }
    img = baseURL + img[0] + '.tif';
    var worker = new Worker('./js/tiff.worker.min.js');
    worker.onmessage = function (event) {
        var data, canvas, context, imageData;
        data = event.data;
        canvas = document.createElement('canvas');
        context = canvas.getContext('2d');
        canvas.width = data.width;
        canvas.height = data.height;
        imageData = context.createImageData(data.width, data.height);
        (imageData).data.set(new Uint8Array(data.image));

        context.putImageData(spread(imageData), 0, 0);
        $('#main_page').empty().append(canvas).append($('<div class="h3">Column&nbsp;&nbsp;</div>').append($('<img>', {
            src: 'arrow-39644_640.png',
            width: (data.width / 2) + "px"
        }))).append('<p>This image has been altered to be more visible and is low resolution due to the image conversion step. Please download the raw image and adjust levels to view if you would like a better quaility image.</p><button class="btn btn-lg btn-primary" onclick=window.open("' + img + '")>Download</button>');
        $(canvas).addClass('img-responsive').addClass('center-block');
    };

    worker.onerror = function () {
        $('#main_page').empty().append('<div class="alert alert-danger"><h2>Failed to load image.</h2></div>');
    };

    //color convert functions from same as hcv genie, took from someone else
    (function () {
        getrgb = function (hsl) {
            var h = hsl[0] / 360;
            var s = hsl[1] / 100;
            var l = hsl[2] / 100;
            var t1;
            var t2;
            var t3;
            var rgb;
            var val, i;

            if (s === 0) {
                val = l * 255;
                return [val, val, val];
            }

            if (l < 0.5) {
                t2 = l * (1 + s);
            } else {
                t2 = l + s - l * s;
            }

            t1 = 2 * l - t2;

            rgb = [0, 0, 0];
            for (i = 0; i < 3; i += 1) {
                t3 = h + 1 / 3 * -(i - 1);
                if (t3 < 0) {
                    t3 += 1;
                }
                if (t3 > 1) {
                    t3 -= 1;
                }

                if (6 * t3 < 1) {
                    val = t1 + (t2 - t1) * 6 * t3;
                } else if (2 * t3 < 1) {
                    val = t2;
                } else if (3 * t3 < 2) {
                    val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
                } else {
                    val = t1;
                }

                rgb[i] = val * 255;
            }

            return rgb;
        };
        gethsl = function (rgb) {
            var r = rgb[0] / 255;
            var g = rgb[1] / 255;
            var b = rgb[2] / 255;
            var min = Math.min(r, g, b);
            var max = Math.max(r, g, b);
            var delta = max - min;
            var h;
            var s;
            var l;

            if (max === min) {
                h = 0;
            } else if (r === max) {
                h = (g - b) / delta;
            } else if (g === max) {
                h = 2 + (b - r) / delta;
            } else if (b === max) {
                h = 4 + (r - g) / delta;
            }

            h = Math.min(h * 60, 360);

            if (h < 0) {
                h += 360;
            }

            l = (min + max) / 2;

            if (max === min) {
                s = 0;
            } else if (l <= 0.5) {
                s = delta / (max + min);
            } else {
                s = delta / (2 - max - min);
            }

            return [h, s * 100, l * 100];
        };
    }());

    worker.postMessage({url: img, memory: 16777216 / 4});

}());
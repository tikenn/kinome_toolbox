(function(exports) {
    var main = {};

    /**
     * Returns an HSL color using a gradient when given a number between 0 and 1 inclusive
     * @param Float number The number between 0 and 1
     * @param String The string representing the gradient
     */
    main.convert = function(number) {
        var hue,
            minHue = 60,
            maxHue = 255,
            hueRange = maxHue - minHue,
            saturation,
            minSaturation = 70,
            maxSaturation = 100 - minSaturation,
            lightness,
            minLightness = 30,
            maxLightness = 60 - minLightness,
            eScale = Math.exp(number) / Math.E;

        hue = hueRange * Math.pow(1 - number, 2) + minHue;
        saturation = eScale * maxSaturation + minSaturation;
        lightness = eScale * maxLightness + minLightness;

        return 'hsl(' + hue + ', ' + saturation + '%, ' + lightness + '%)';
    };

    /**
     * Creates a color bar that displays a representation of the gradient created above
     * @param Int height The height of the bar to be 
     * @param Int 
     */
    main.colorBar = function(height, width, leftLabel, rightLabel) {
        var canvas = document.createElement('canvas'),
            ctx,
            $canvasContainer = $('<div>'),
            $labelContainer,
            fontSize;

        leftLabel = leftLabel || 'Lo';
        rightLabel = rightLabel || 'Hi';
        fontSize = height + 1;
        $labelContainer = $('<p>').css({'display': 'inline', 'font-weight': 'normal', 'font-size': fontSize});

        canvas.height = height;
        canvas.width = width;
        ctx = canvas.getContext('2d');
        for (var i = 0; i < canvas.width; i++) {
            ctx.fillStyle = main.convert(i / canvas.width);
            ctx.fillRect(i, 0, 1, canvas.height);
        }

        $canvasContainer
            .append($labelContainer.clone().text(leftLabel).css({'padding-right': '5px'}))
            .append($(canvas))
            .append($labelContainer.clone().text(rightLabel).css({'padding-left': '5px'}));

        $canvasContainer.css({'display': 'inline'});
        return $canvasContainer;
    };

    exports.gradient = main;
}(KINOME));
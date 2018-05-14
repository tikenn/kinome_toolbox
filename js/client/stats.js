var STATS = {};
/*Still building this up*/
(function (exports) {
    'use strict';

    exports.corr = {};

    exports.corr.pearson = (function () {
        var add2, sqr2, cross, add;
        add2 = function (a, b) {
            return [a[0] + b[0], a[1] + b[1]];
        };
        sqr2 = function (x) {
            return [x[0] * x[0], x[1] * x[1]];
        };
        cross = function (x) {
            return x[0] * x[1];
        };
        add = function (a, b) {
            return a + b;
        };
        return function (dataIn) {
            var i = 0, data = [];
            //remove all bad points
            for (i = 0; i < dataIn.length; i += 1) {
                dataIn[i][0] = parseFloat(dataIn[i][0]);
                dataIn[i][1] = parseFloat(dataIn[i][1]);
                if (
                    typeof dataIn[i][0] === 'number' && !isNaN(dataIn[i][0]) &&
                    typeof dataIn[i][1] === 'number' && !isNaN(dataIn[i][1]) &&
                    isFinite(dataIn[i][0]) && isFinite(dataIn[i][1])
                ) {
                    data.push([dataIn[i][0], dataIn[i][1]]);
                }
            }
            if (!data.length) {
                return 0;
            }
            var sums = data.reduce(add2);
            var sqrSums = data.map(sqr2).reduce(add2);
            var pSum = data.map(cross).reduce(add);
            var n = data.length;

            var num = pSum - (sums[0] * sums[1] / n);
            var den = Math.sqrt(
                (sqrSums[0] - sums[0] * sums[0] / n) *
                (sqrSums[1] - sums[1] * sums[1] / n)
            );

            if (den === 0) {
                return 0;
            }

            return num / den;
        };
    }());

    exports.corr.spearman = (function () {
        var numSort = function (a, b) {
            return a[0] - b[0];
        };
        return function (data) {
            var x = [], y = [], i, dataOut = [], count = 0;
            data.map(function (pnt) {
                pnt[0] = parseFloat(pnt[0]);
                pnt[1] = parseFloat(pnt[1]);
                if (
                    typeof pnt[0] === 'number' && !isNaN(pnt[0]) &&
                    typeof pnt[1] === 'number' && !isNaN(pnt[1]) &&
                    isFinite(pnt[0]) && isFinite(pnt[1])
                ) {
                    x.push([pnt[0], count]);
                    y.push([pnt[1], count]);
                    count += 1;
                }
            });
            x = x.sort(numSort);
            y = y.sort(numSort);

            for (i = 0; i < x.length; i += 1) {
                dataOut[x[i][1]] = dataOut[x[i][1]] || [];
                dataOut[y[i][1]] = dataOut[y[i][1]] || [];
                dataOut[x[i][1]][0] = i;
                dataOut[y[i][1]][1] = i;
            }

            return exports.corr.pearson(dataOut);
        };
    }());

}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : STATS
));

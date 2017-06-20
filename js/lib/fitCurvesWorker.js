/*global self, Math*/

// TODO: check user input...
//Container for all code. Will be run on load
(function () {
    'use strict';

    //variable declarations
    var fmincon, determineRunningConditions, runsTest, linearReg, errorList, robustFit;//, smoothYs;

    //variable definitions

    //function definitions
    fmincon = (function () {
        //please note - this is a minimized version of fmincon from amdjs_1.1.0.js
        //variable declarations
        var sqrSumOfErrors, sqrSumOfDeviations, func, calcCurvature;

        //variable defintions

        //function definitions
        func = function (X, y, fun, x0, trouble) {
            //variable definitions
            var corrIsh, itt, lastItter, options, parI, SSDTot, sse, SSETot, x1,
                    linCor, curve, aoc, start, finish, step;

            //variable declarations
            options = {
                step: x0.map(function (s) {return s / 100; }),
                maxItt: 500,
                minPer: 1e-6
            };
            lastItter = Infinity;
            x1 = JSON.parse(JSON.stringify(x0));

            //Actually begin looping through all the data
            for (itt = 0; itt < options.maxItt; itt += 1) {

                //Go through all the parameters
                for (parI in x1) {
                    if (x1.hasOwnProperty(parI)) {
                        x1[parI] += options.step[parI];
                        if (sqrSumOfErrors(fun, X, y, x1) < sqrSumOfErrors(fun, X, y, x0)) {
                            x0[parI] = x1[parI];
                            options.step[parI] *= 1.2;
                        } else {
                            x1[parI] = x0[parI];
                            options.step[parI] *= -0.5;
                        }
                    }
                }

                //make it so it checks every 3 rotations for end case
                if ((itt % 3) === 0) {
                    sse = sqrSumOfErrors(fun, X, y, x0);
                    if (Math.abs(1 - sse / lastItter) < options.minPer) {
                        break;
                    }
                    lastItter = sse;
                }
            }

            //I added the following 'R^2' like calculation.
            SSDTot = sqrSumOfDeviations(y);
            SSETot = sqrSumOfErrors(fun, X, y, x0);
            corrIsh = 1 - Math.min(SSETot / SSDTot,1);


            if (!X[0]) {
                var aaa = 2;
            }

            if (X[0].length === 1) {
                linCor = linearReg(X, y);
                curve = calcCurvature(function(X_i) {
                    return linCor.parameters[0] * X_i[0] + linCor.parameters[1];
                }, fun, x0, X, y);

                curve.push(Math.log10((1 - linCor.R2) / (1 - corrIsh)));
            }

            return {errors: errorList(fun, X, y, x0), curvature: curve, parameters: x0, totalSqrErrors: SSETot, R2: corrIsh, linearR2: linCor.R2, linear:linCor, WWtest: runsTest(fun, X, y, x0)};
            // return {parameters: x0, totalSqrErrors: SSETot, R2: corrIsh, linearR2: linCor.R2, linear:linCor, WWtest: runsTest(fun, X, y, x0)};
        };

        sqrSumOfErrors = function (fun, X, y, x0) {
            //variable declarations
            var error = 0, i, n = X.length;
            for (i = 0; i < n; i += 1) {
                error += Math.pow(fun(X[i], x0) - y[i], 2);
            }
            return error;
        };

        errorList = function (fun, X, y, x0) {
            //variable declarations
            var error = [], i, n = X.length;
            for (i = 0; i < n; i += 1) {
                error.push({error: fun(X[i], x0) - y[i], y: y[i]});
            }
            return error;
        };

        sqrSumOfDeviations = function (y) {
            //variable declarations
            var avg, error, length, i;
            //variable definitions
            error = 0;
            avg = 0;
            length = y.length;
            //find average
            for (i = 0; i < length; i += 1) {
                avg += y[i];
            }
            avg = avg / length;
            //find ssd
            for (i = 0; i < length; i += 1) {
                error += Math.pow(y[i] - avg, 2);
            }
            return error;
        };

        calcCurvature = function (linearFunc, nonLinear, params, X, y) {
            var avgDiff, errorDiff, length, m1, m2, i, e1, e2;
            //Calculating a number of things:
                // Sum of deviations at each point
                // Sqr difference between the models

            avgDiff = 0;
            errorDiff = 0;
            length = X.length;

            //find averages
            for (i = 0; i < length; i += 1) {
                m1 = nonLinear(X[i], params);
                m2 = linearFunc(X[i]);
                avgDiff += Math.pow(m1 - m2, 2);
                e1 = Math.pow(m1 - y[i], 2);
                e2 = Math.pow(m2 - y[i], 2);
                errorDiff += (e2 - e1) / Math.max(e1, e2);
            }

            avgDiff /= length;
            errorDiff /= length;

            return [avgDiff, errorDiff, runsTest(linearFunc, X, y, [])];
        };

        //return function
        return func;
    }());

    linearReg = (function () {
        var runLOO, func;

        func = function (x, y) {
            var i, j, m, b, xi, xysum = 0, x2sum = 0, xsum = 0, ysum = 0, y2sum = 0, n = x.length, R2;

            for (i = 0; i < n; i += 1) {
                if (x[i].length === 1) {
                    xi = x[i][0];
                } else if (x[i].length > 1) {
                    xi = 0;
                } else {
                    xi = x[i];
                }
                ysum += y[i];
                xsum += xi;
                x2sum += xi * xi;
                y2sum += y[i] * y[i];
                xysum += xi * y[i];
            }

            m = (xysum - xsum * ysum / n) / (x2sum - xsum * xsum / n);
            b = (ysum - m * xsum) / n;

            R2 = Math.pow(xysum - xsum * ysum / n, 2) / (x2sum - xsum * xsum / n) / (y2sum - ysum * ysum / n);
            //Ezekiel adjusted
            //R2 = 1 - (n - 1) / (n - 2) * (1 - R2);

            // return {parameters: [m, b], R2: R2};
            return {parameters: [m, b], R2: R2, errors: errorList(function (X, P) {
                return X[0] * P[0] + P[1];
            }, x, y, [m, b])};

        };

        runLOO = function (x, y) {
            //This is left out for now, but it was used to determine the best
            //data fit.
            var i, miniSol, solution = func(x, y), solutions = [], diff, thisAns = -1;
            //To perform a leave one out check on this data
            solution.R2 = 1 - (x.length - 1) / (x.length - 2) * (1 - solutions.R2);
            solutions.push(JSON.parse(JSON.stringify(solution)));
            for (i = 0; i < x.length; i += 1) {
                miniSol = func(x.slice(0, i).concat(x.slice(i + 1, x.length)), y.slice(0, i).concat(y.slice(i + 1, y.length)));
                miniSol.R2 = 1 - (x.length - 1) / (x.length - 2) * (1 - miniSol.R2);
                if (miniSol.R2 > solution.R2) {
                    thisAns = i;
                    solution = miniSol;
                }
                solutions.push(JSON.parse(JSON.stringify(miniSol)));
            }
            // solution.R2 = thisAns;
            return solution;
        };

        return func;
    }());

    robustFit = function (robustCount, fitFunc, X, y, o1, o2, o3, o4) {
        var i, R2_sse, adjR2, fitAll, sX, sy, k, R2, R2_max, fit, f0, R2_arr = [], R2_sum = 0, maxR2;
        if (o2) {
            k = o2.length;
        } else {
            k = 1;
        }

        adjR2 = function (fit) {
            return 1-(1 - fit.R2) * (fit.errors.length - 1) / (fit.errors.length - fit.parameters.length - 1);
        };

        fitAll = fitFunc(X, y, o1, o2, o3, o4);
        fitAll.remove = -1;
        R2_sum += adjR2(fitAll);
        R2_arr.push([adjR2(fitAll), fitAll, -1]);

        //Fit leaving one out each time
        for (i = 0; i < X.length; i += 1) {
            sX = JSON.parse(JSON.stringify(X));
            sy = JSON.parse(JSON.stringify(y));
            sX.splice(i, 1);
            sy.splice(i, 1);
            fit = fitFunc(sX, sy, o1, o2, o3, o4);
            R2_sum += adjR2(fit);
            R2_arr.push([adjR2(fit), fit, i]);
        }

        //Now go back and see if one R2 is significantly higher than the others
        R2_arr = R2_arr.sort(function (a, b) {
            return a[0] - b[0];
        });
        maxR2 = R2_arr.pop();
        R2_sum -= maxR2[0];
        R2_sum = R2_sum / R2_arr.length; //average of non maxR2
        R2_sse = R2_arr.map(function (a) {
            return Math.pow(R2_sum - a[0], 2);
        }).reduce(function (a, b) {
            return a + b;
        });

        //If it make a huge difference
        if (R2_sum + Math.sqrt(R2_sse / R2_arr.length) * 2 < maxR2[0]) {
            fitAll = maxR2[1];
            fitAll.remove = maxR2[2];
        }

        //now actual return
        fitAll.robust = robustCount;
        // fitAll.tempR = [R2_sse, R2_sum, maxR2, R2_arr, R2_sum + Math.sqrt(R2_sse / (R2_arr.length - 1)) * 2];
        // fitAll.rob_fit = {
        //     all: JSON.parse(JSON.stringify(f0)),
        //     rem: JSON.parse(JSON.stringify(fits))
        // };
        return fitAll;
    };

    //This was a test to see if an error could be corrected at the curve fit level
    // The solution eneded up being elsewhere.
    // smoothYs = function (xs, ys) {
        // var i, j, yOut = [], denom, indDenom, tester, max, min, start, wind = 1;
        // max = Math.max.apply(null, xs);
        // min = Math.min.apply(null, xs);
        // for (i = 0; i < xs.length; i += 1) {
        //     yOut[i] = 0;
        //     denom = 0;
        //     start = i < wind
        //         ? 0
        //         : i - wind;
        //     for (j = start; j <= i + wind && j < xs.length; j += 1) {
        //         indDenom = Math.pow(1 - Math.pow(Math.abs(xs[j] - xs[i]) / (max - min),3),3);
        //         yOut[i] += ys[j] * indDenom;
        //         denom += indDenom;
        //     }
        //     yOut[i] /= denom;
        // }

        // var i, j, yOut = [], denom, indDenom;
        // for (i = 0; i < xs.length; i += 1) {
        //     yOut[i] = 0;
        //     denom = 0;
        //     for (j = 0; j < xs.length; j += 1) {
        //         indDenom = Math.exp(-Math.abs(xs[j] - xs[i]));
        //         yOut[i] += ys[j] * indDenom;
        //         denom += indDenom;
        //     }
        //     yOut[i] /= denom;
        // }
        // return yOut;
    // };

    determineRunningConditions = function (object) {
        //variable declarations
        var i, minL, X, xIni, yIni, length, equationObj, linear = false, retObj, robust = false;

        //variable defintions
        X = object.x;
        xIni = [];
        yIni = [];
        length = X.length;

        if (object.equation.string === 'linear') {
            linear = true;
        } else {
            equationObj = eval('equationObj=' + object.equation.string);
        }



        //determine what points are 'good'
        for (i = 0; i < length; i += 1) {
            if (object.valid[i]) {
                xIni.push([X[i]]); // This is to be used for the curve fitting
                yIni.push(object.y[i]);
            }
        }

        minL = object.equation.string === 'linear'
            ? 2
            : 3;
        if (xIni.length < minL) {
            //add in at least first minL points regardless of outlier status
            for (i = 0; i < minL; i += 1) {
                if (!object.valid[i]) {
                    xIni.push([X[i]]);
                    yIni.push(object.y[i]);
                }
            }
        }

        if (object.equation.robust) {
            robust = object.equation.robust;
        }
        if (linear) {
            retObj = {robust: robust, X: xIni, y: yIni, linear: linear};
        } else {
            // yIni = smoothYs(xIni.map(function (xx) {
            //     return xx[0];
            // }), yIni);
            retObj = {robust: robust, params: equationObj.setInitial(xIni, yIni), X: xIni, y: yIni, func: equationObj.func, linear: linear, aoc: object.aoc};
        }
        return retObj;
    };

    self.onmessage = function (event) {
        //variable declarations
        var result, runCond;

        /*
            Expects data object with a model obj and an origin obj
            model object should have:
                equation: {string: <eqString>} //if string == "linear" then this
                        does a linear fit
                x: [[x_v0], [x_v1], ...]
                y: [y0, y1, ...]
                valid: [bool1, bool2, ...]
            origin object can have whatever, it is returned to the calling func
        */

        //variable definitions
        runCond = determineRunningConditions(event.data.model);

        if (runCond.linear) {
            result = runCond.robust
                ? robustFit(runCond.robust, linearReg, runCond.X, runCond.y)
                : linearReg(runCond.X, runCond.y);
        } else {
            result = runCond.robust
                ? robustFit(runCond.robust, fmincon, runCond.X, runCond.y, runCond.func, runCond.params, event.data, runCond.aoc)
                : fmincon(runCond.X, runCond.y, runCond.func, runCond.params, event.data, runCond.aoc);
        }

        //return result
        self.postMessage([event.data.origin, result]);
    };

    runsTest = (function () {
        var main, combineDict, runsPDF, factorial, factorialDivide, combine;

        main = function (func, X, y, p0) {
            //Variable declaration
            var i, signC, signL, counts, typeRuns, current, tot;

            //Variable assignment
            counts = [1, 0];
            typeRuns = [1, 0];
            current = 0;
            tot = X.length;

            //Count the number of switches and runs of (-) versus (+)
            //Note since runs(n1, n2, r) == runs(n2, n1, r) it is not important the direction, just the number of switches
            //Initialize the 'last' sign, actual - predicted
            signL = y[0] - func(X[0], p0);
            for (i = 1; i < tot; i += 1) {
                //Calculate this sign actual - predicted
                signC = y[i] - func(X[i], p0);

                if (signC * signL <= 0) { // This means if the model is ever perfect, it counts as a switch
                    //Switch current from 0->1 or 1->0
                    current = (current + 1) % 2;

                    //Increment the number of runs for this type, note type '0' began with 1
                    typeRuns[current] += 1;
                }
                //Current count incriment, reasign the 'last' sign
                counts[current] += 1;
                signL = signC;

            }

            //Actually calculate the runs PDF
            return [runsPDF(counts[0], counts[1], typeRuns[0] + typeRuns[1]), typeRuns[0] + typeRuns[1]];
        };

        runsPDF = function (n1, n2, r) {
            var sol, testOdd = r % 2;
            if (r < 2) { // This only works for r >= 2.
                sol = 0;
            } else if (testOdd) { // odd
                sol = (combine(n1 - 1, (r - 1) / 2) * combine(n2 - 1, (r - 3) / 2) + combine(n1 - 1, (r - 3) / 2) * combine(n2 - 1, (r - 1) / 2)) / combine(n1 + n2, n1);
            } else { //even
                sol = 2 * combine(n1 - 1, r / 2 - 1) * combine(n2 - 1, r / 2 - 1) / combine(n1 + n2, n1);
            }
            return sol;
        };

        combine = function (n, r) {
            var sol;
            if (r > n) {
                sol = 0;
            } else if (combineDict.hasOwnProperty(n)) {
                if (combineDict[n].hasOwnProperty(r)) {
                    sol = combineDict[n][r];
                }
            } else {
                sol = factorialDivide(n, Math.max(n - r, r)) / factorial(Math.min(n - r, r));
            }
            return sol;
        };

        factorial = function (x) {
            var ret = 1, i;
            if (x >= 1) {
                for (i = x; i > 1; i -= 1) {
                    ret = ret * i;
                }
            }
            return ret;
        };

        factorialDivide = function (top, bottom) {
            var i, sol = 1;
            //Note: By the nature of previous screening the top >= bottom, however this will not work without
                // dealing with the opposite posibility if migrated to other locations
            for (i = top; i > bottom; i += -1) {
                sol *= i;
            }
            return sol;
        };


        //This is the presolved combination dictionary from 1->13, the limit of my use for this, could easily be expanded, however it will increase load time.
        combineDict = { 1: { 0: 1, 1: 1 }, 2: { 0: 1, 1: 2, 2: 1 }, 3: { 0: 1, 1: 3, 2: 3, 3: 1 }, 4: { 0: 1, 1: 4, 2: 6, 3: 4, 4: 1 }, 5: { 0: 1, 1: 5, 2: 10, 3: 10, 4: 5, 5: 1 }, 6: { 0: 1, 1: 6, 2: 15, 3: 20, 4: 15, 5: 6, 6: 1 }, 7: { 0: 1, 1: 7, 2: 21, 3: 35, 4: 35, 5: 21, 6: 7, 7: 1 }, 8: { 0: 1, 1: 8, 2: 28, 3: 56, 4: 70, 5: 56, 6: 28, 7: 8, 8: 1 }, 9: { 0: 1, 1: 9, 2: 36, 3: 84, 4: 126, 5: 126, 6: 84, 7: 36, 8: 9, 9: 1 }, 10: { 0: 1, 1: 10, 2: 45, 3: 120, 4: 210, 5: 252, 6: 210, 7: 120, 8: 45, 9: 10, 10: 1 }, 11: { 0: 1, 1: 11, 2: 55, 3: 165, 4: 330, 5: 462, 6: 462, 7: 330, 8: 165, 9: 55, 10: 11, 11: 1 }, 12: { 0: 1, 1: 12, 2: 66, 3: 220, 4: 495, 5: 792, 6: 924, 7: 792, 8: 495, 9: 220, 10: 66, 11: 12, 12: 1 }, 13: { 0: 1, 1: 13, 2: 78, 3: 286, 4: 715, 5: 1287, 6: 1716, 7: 1716, 8: 1287, 9: 715, 10: 286, 11: 78, 12: 13, 13: 1 } };

        return main;
    }());

}());
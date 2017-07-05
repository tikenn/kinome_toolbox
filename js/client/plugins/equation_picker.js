/*global M require PROMISE KINOME module google jQuery save $ window*/
(function (exports) {
    'use strict';

    var equation_selector;
    require('bs_toggle-js');
    require("bs_toggle-css", 'style');

    /*
        Takes two parameters:
            data array: an array of enriched kinome objects
            picker object: a 'picker' either peptide picker or image picker, this object
                will have the color and change functions overwritten and the ability to
                update them removed.

        Returns an object with the following properties:
            div: The equation picker div as a single row, linear left, kinetic right
            col: {
                kinetic: The kinetic eq picker column, unformatted
                linear: The linear eq picker column, unformatted
            }
            change: function that takes a function that fires on change of selection. (More below)

        Change function:
            This function when set above will recieve an object when it fires
            {
                //Whatever properties are created by the picker passed in

                eq: {
                    linear: {
                        eval: function that takes a data.get object and evaluates the function the user has selected
                                <optional> and a second parameter forcing the c_e to be based on a specific cycle number ie (32, 36, ... 'Post Wash')
                        parameter: the parameter string they have chosen
                        equation_str: string of the equation being used
                    }
                    kinetic: {
                        eval: function that takes a data.get object and evaluates the function the user has selected
                                <optional> and a second parameter forcing the c_e to be based on a specific exposure time ie (10,20,50,100,200,'Cycle Series')
                        parameter: the parameter string they have chosen
                        equation_str: string of the equation being used
                    }
                }
            }
    */

    equation_selector = function (DATA, picker) {

        //This has a lot of state objects.... Should combine, but this was easier at first
        var equation_state, my_state_obj = {}, color_it_on, currentEQnum, thisState,
                //ui components
                build_columns, $page_obj = {}, get_ce,
                //interacti with picker
                pep_picked, chainSetColorFunc, pepChangedSetter,
                //save values
                minimums = {linear: {}, kinetic: {}}, equationOpts,
                //helper functions
                uppercase, changeFunc,
                //for returning
                main = {};

        //possible equations
        (function () {
            var retSignal, retBack, retSigDBack, retSigMBack;
            retSignal = function (object, type) {
                return object.signal.parameters[my_state_obj[type].param];
            };
            retBack = function (object, type) {
                return object.background.parameters[my_state_obj[type].param];
            };
            retSigDBack = function (object, type) {
                return Math.log(
                    object.signal.parameters[my_state_obj[type].param] /
                    object.background.parameters[my_state_obj[type].param]
                ) / Math.log(2);
            };
            retSigMBack = function (object, type, baseCe) {
                //this is the hard one...
                var min = get_ce(type, baseCe);
                if (object.signal.parameters[my_state_obj[type].param] - object.background.parameters[my_state_obj[type].param] < min) {
                    return NaN;
                } else {
                    return Math.log(100 * (object.signal.parameters[my_state_obj[type].param] - object.background.parameters[my_state_obj[type].param] - (min) + 1)) / Math.log(2);
                }
            };

            get_ce = function (type, baseCe) {
                var all, i, key2, get_obj, min, allVals = [];
                if (type === 'kinetic') {

                    key2 = baseCe !== undefined
                        ? baseCe
                        : thisState.exposure;
                    get_obj = {type: type, exposure: key2};
                } else {
                    key2 = baseCe !== undefined
                        ? baseCe
                        : thisState.cycle;
                    get_obj = {type: type, cycle: key2};
                }
                // if (baseCe) {console.log(thisState, type, baseCe, key2, get_obj)}
                minimums[type][my_state_obj[type].param] = minimums[type][my_state_obj[type].param] || {};
                if (minimums[type][my_state_obj[type].param][key2] !== undefined) {
                    min = minimums[type][my_state_obj[type].param][key2];
                } else {
                    all = DATA.get(get_obj);
                    // console.log(all);
                    for (i = 0; i < all.length; i += 1) {
                        allVals.push(all[i].signal.parameters[my_state_obj[type].param] - all[i].background.parameters[my_state_obj[type].param]);
                    }
                    allVals = allVals.sort(function (a, b) {
                        return a - b;
                    });
                    min = allVals[Math.floor(allVals.length / 20) - 1];
                    minimums[type][my_state_obj[type].param][key2] = min;
                    // console.log(all, get_obj, min);
                }
                return min;
            };

            equationOpts = [
                ['Signal', 'signal', retSignal, 'signal'],
                ['Background', 'background', retBack, 'background'],
                ['log_2(s / b)', M.sToMathE("log_2({signal}/{background})").outerHTML, retSigDBack, "log_2({signal}/{background})"],
                ['log_2(100(s - b + c_e))', M.sToMathE("log_2{100(signal-background+c_e)}").outerHTML, retSigMBack, "log_2{100(signal-background+c_e)}"]
            ];

            equation_state = {kinetic: retSigDBack, linear: retSigDBack};
        }());

        changeFunc = function () {
            //just doesn't do anything....
            return;
        };

        //Make sure the picker object looks right
        if (typeof picker !== 'object' || typeof picker.change !== 'function') {
            console.error("The equation selector requires a picker plugin object with a change function be passed in along with data.");
            return;
        }
        console.warn('The equation selector plugin overwrites the picker plugin change function. Any change function already set or color change function already set will be removed.');
        if (picker.setColorFunc) {
            chainSetColorFunc = picker.setColorFunc;
            delete picker.setColorFunc;
        }
        pepChangedSetter = picker.change;
        delete picker.change;

        //set global defaults for state objects
        my_state_obj.linear = {
            param: "0"
        };
        my_state_obj.kinetic = {
            param: "0"
        };
        //eq state is set at end of self closure above
        currentEQnum = {linear: 2, kinetic: 2};

        //peptide picker response
        pep_picked = function (picker_state_object) {
            /*Fire change function giving it the state of this system*/
            var objectOut = JSON.parse(JSON.stringify(picker_state_object));
            thisState = picker_state_object;

            //Set up picker state based what just came in and build the columns
            if (!my_state_obj.sample || my_state_obj.sample.name !== picker_state_object.sample.name) {
                //update parameters and rebuild choices
                my_state_obj.linear.params = picker_state_object.sample.linear.equation.mathParams;
                my_state_obj.kinetic.params = picker_state_object.sample.kinetic.equation.mathParams;
                my_state_obj.linear.equation_str = picker_state_object.sample.linear.equation.mathType;
                my_state_obj.kinetic.equation_str = picker_state_object.sample.kinetic.equation.mathType;
                my_state_obj.sample = picker_state_object.sample;
                build_columns('linear');
                build_columns('kinetic');
            }

            //enrich the state object
            if (picker_state_object.sample && typeof picker_state_object.sample.clone === 'function') {
                objectOut.sample = picker_state_object.sample.clone();
            }

            objectOut.eq = {};
            objectOut.eq.linear = {
                eval: function (data, baseCe) {
                    return equation_state.linear(data, 'linear', baseCe);
                },
                parameter: my_state_obj.linear.params[my_state_obj.linear.param],
                equation_str: equationOpts[currentEQnum.linear][3]
            };
            objectOut.eq.kinetic = {
                eval: function (data, baseCe) {
                    return equation_state.kinetic(data, 'kinetic', baseCe);
                },
                parameter: my_state_obj.kinetic.params[my_state_obj.kinetic.param],
                equation_str: equationOpts[currentEQnum.kinetic][3]
            };

            changeFunc(objectOut);
        };

        uppercase = function (str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        };

        /*                          //
            Create page components  //
        */                          //
        /*
            Figures for each side
        */
        $page_obj.parameterSelector = $('<div>', {class: 'row'});
        $page_obj.linear = {};
        $page_obj.kinetic = {};
        $page_obj.linear.colHolder = $('<div>', {class: 'col col-xs-12 col-sm-6'});
        $page_obj.kinetic.colHolder = $('<div>', {class: 'col col-xs-12 col-sm-6'});
        $page_obj.linear.col = $('<div>');
        $page_obj.kinetic.col = $('<div>');

        //essentially the holder sets the width, and the col itself is returned
        // without any formatting of width.
        $page_obj.linear.colHolder.append($page_obj.linear.col);
        $page_obj.kinetic.colHolder.append($page_obj.kinetic.col);

        $page_obj.buttons = [];

        //Now build each side
        build_columns = function (type) {
            var part = $page_obj[type], i, btn, oneOpt, ce;

            //empty what is there, then build stuff
            part.col.empty();
            part.title = $('<div>');
            part.title.append($('<h3>' + uppercase(type) + ' Options</h3>'));

            //essentially if the peptide picker is present, add a color by button.
            if (typeof chainSetColorFunc === 'function') {
                btn = $('<button>', {text: 'Color By', class: 'btn btn-default'}).click(function () {
                    $page_obj.buttons.map(function (x) {
                        x.removeClass('active');
                    });
                    $page_obj.buttons.map(function (x) {
                        x.text('Color By');
                    });
                    $(this).addClass('active');
                    $(this).text('Colored By');
                    if (color_it_on !== type) {
                        color_it_on = type;
                        pep_picked(thisState);
                    }
                });
                part.title.append(btn);
                $page_obj.buttons.push(btn);
                if (!color_it_on) {
                    btn.click();
                }
            }

            //equation displays
            part.equationTitle = $('<h4>Model Parameterized</h4>');
            part.equation = $('<div>', {
                style: "min-height: 40px;display: table;"
            }).append($('<div>', {
                style: 'display: table-cell;vertical-align:middle;'
            }).append(
                M.sToMathE(my_state_obj[type].equation_str)
            ));

            //parameter picker
            part.parameterTitle = $('<h4>Parameter Viewing</h4>');
            part.parameterPicker = $('<select>', {style: 'vertical-align: middle', class: 'form-control'});
            //Background Correction
            part.backCorrTitle = $('<h4>Background Correction</h4>');
            part.backCorrPicker = $('<select>', {style: 'vertical-align: middle', class: 'form-control'});
            part.backCorrSelected = $('<div>', {style: 'margin-top:15px;', class: 'text-center'});

            //add in all the parts in order
            part.col
                .append(part.title)
                .append(part.equationTitle)
                .append(part.equation)
                .append(part.parameterTitle)
                .append(part.parameterPicker)
                .append(part.backCorrTitle)
                .append(part.backCorrPicker)
                .append(part.backCorrSelected);

            //Add in the menu options for the parameter
            //make sure parameter selected is still defined
            if (my_state_obj[type].param === 'undefined' || my_state_obj[type].param * 1 > my_state_obj[type].params.length) {
                my_state_obj[type].param = 0;
            }

            for (i = 0; i < my_state_obj[type].params.length; i += 1) {
                oneOpt = $(
                    '<option value="' + i + '">' +
                    my_state_obj[type].params[i] + "</option>"
                );

                if (my_state_obj[type].param * 1 === i) {
                    oneOpt.attr('selected', 'true');
                }

                part.parameterPicker.append(oneOpt);
            }
            part.parameterPicker.change(function (evt) {
                var selected = evt.target.value;
                my_state_obj[type].param = selected;
                pep_picked(thisState);
            });

            //Now add in menu options for the correction picker
            for (i = 0; i < equationOpts.length; i += 1) {
                oneOpt = $(
                    '<option value="' + i + '">' +
                    equationOpts[i][0] + "</option>"
                );
                if (currentEQnum[type] * 1 === i) {
                    oneOpt.attr('selected', 'true');
                }
                part.backCorrPicker.append(oneOpt);
            }
            part.backCorrPicker.change(function (evt) {
                var selected = evt.target.value;

                //update the state stuff
                currentEQnum[type] = selected;
                equation_state[type] = equationOpts[selected][2];
                part.backCorrSelected.html(equationOpts[selected][1]);

                if (selected === "3") {
                    ce = 1 - get_ce(type);
                    // console.log(ce);
                    part.backCorrSelected.append(",&nbsp;&nbsp;").append(
                        M.sToMathE("c_e=" + ce.toFixed(4))
                    );
                }
                pep_picked(thisState);
            });

            //default for equation viewed
            part.backCorrSelected.html(equationOpts[currentEQnum[type]][1]);
            if (currentEQnum[type] === "3") {
                ce = 1 - get_ce(type);
                    // console.log(ce);
                part.backCorrSelected.append(",&nbsp;&nbsp;").append(
                    M.sToMathE("c_e=" + ce.toFixed(4))
                );
            }
        };

        $page_obj.parameterSelector
            .append($page_obj.linear.colHolder)
            .append($page_obj.kinetic.colHolder);

        pepChangedSetter(pep_picked);

        //add the parts to main
        main.div = $page_obj.parameterSelector;
        main.col = {
            kinetic: $page_obj.kinetic.col,
            linear: $page_obj.linear.col
        };
        main.change = function (newChangeFunc) {
            if (typeof newChangeFunc === 'function') {
                changeFunc = newChangeFunc;
            }
            pep_picked(thisState);
        };
        if (typeof chainSetColorFunc === 'function') {
            main.setColorFunc = function (func) {
                chainSetColorFunc(function (params) {
                    params.type = color_it_on;
                    params.exec = function (data) {
                        return equation_state[color_it_on](data, color_it_on);
                    };
                    params.parameter =
                            my_state_obj[color_it_on].params[my_state_obj[color_it_on].param];
                    return func(params);
                });
            };
        }

        return main;
    };

    exports.equationPicker = equation_selector;

}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));
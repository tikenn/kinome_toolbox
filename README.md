# Welcome to the Kinome Toolbox

###### A platform for analysis and visualization of PamGene PamChip peptide arrays.

This toolbox has 3 distinct parts.

1. [File Parsing](#server-side-file-parsing) A small bit of node code that can be utilized to automatically parse a new file into all the different components and add them to the database.
2. [Hosting server](#monogo-with-restify) A server component made to host your own data. This is set up to run with just about any flavor of linux, it is the exact server configuration that we utilize (CentOS 7-3 and Ubuntu 16 tested).
3. [Web Toolbox](#web-toolbox) A series of client side JavaScript scripts that create the pages for the toolbox.

## Getting started (client side)

There are a lot of functions and tools you can use to interact with our data. What follows is our 'hello world' example. 

Start by loading in some data. The data in our pending publication can be loaded using this shortened URL.

http://bit.kinomecore.com/?p1_1.0.0

From here you can either use the [developer console](https://developers.google.com/web/tools/chrome-devtools/console/) or create your own script, loading it in by adding the &code="*\<script_url\>*" to the resolved url, or the url above. [More info...](#toolbox-parameters)

After that here is the "hello world script" that gets all the lvl 1.0.0 data and logs one data point to the console and on a new analysis tab.

```JavaScript
(function () {
    'use strict';

    //Get all level 1.0.0 data in here
    var dataArr = KINOME.get({level: '1.0.0'});

    //Get the data list information explicitly, 
    // these can also be listed with a single dataArr.list().
    var ids = dataArr.list('ids');
    var cycles = dataArr.list('cycles');
    var exposures = dataArr.list('exposures');
    var peptides = dataArr.list('peptides');

    //Just get the first one from all of these things
    var onePoint = dataArr.get({
        id: ids[0],
        cycle: cycles[0],
        exposure: exposures[0],
        peptide: peptides[0]
    });

    //Log it to the developers console
    console.log(onePoint);

    //create div
    var myDiv = KINOME.addAnalysis('Print One');

    //pretty print the object to the div minus functions
    myDiv.html(
        JSON.stringify(onePoint, null, 2)
            .replace(/\ /g, '&nbsp;')
            .replace(/\n/g,'<br />')
    );

}());
```

The KINOME based functions and many more are described below [Web Toolbox](#web-toolbox).

The dataArr functions and many more are described below  [Kinome Data Objects](#kinome-data-objects).

## Getting started (server side)

Skip to [Web Toolbox](#web-toolbox) if you are just interested in using the client side developer tools.

(Coming soon: Docker).

Download the repository with:

```git clone https://github.com/kinome/kinome_toolbox.git```

To get our updates you will have to issue a pull command from within the folder you downloaded the code base to periodically.

```git pull```

There are only three things missing from a full installation. All of these have to be installed globally with root privileges. The monogdb instance will likely require some work to get the dependencies set up correctly, this is out of the scope of this readme, but can be found on their [website](https://docs.mongodb.com/).

1. [Node and npm](https://nodejs.org/en/download/), (these come packaged together).
2. (Only required if you are hosting your own data.) A [mongodb](https://docs.mongodb.com/manual/installation/) instance. Once this is installed you will have to start it up and make sure it runs on reboot.
3. (Only required if you are hosting your own data for external use.) Either [forever](https://github.com/foreverjs/forever) or [pm2](http://pm2.keymetrics.io/) to ensure the server keeps running through restarts and non-fatal errors. 

Once those dependencies are met, you need to build the npm modules. Navigate to the folder that you have downloaded with the clone then type:

```npm install```

This will download all the local repositories that are needed for a working server and for the server side parsing. Unfortunately these are not currently seperable.


## Server Side File Parsing

Skip to [Web Toolbox](#web-toolbox) if you are just interested in using the client side developer tools.

After following the instructions in [Getting Started](#getting-started-server-side) you will be able to get this component up quickly. This is used by pointing index.js at your file of interest.

``` node index.js -h ```

Prints help options which are:

| Flag | Description |
| ---- | ----------- |
| -b | (Required.) Link to the background crosstab file as exported from bionavigator. When exporting, select to export all possible meta data on both peptides and samples. |
| -s | (Required.) Link to the signals crosstab file as exported from bionavigator. When exporting, select to export all possible meta data on both peptides and samples. |
| -o | (Highly recommended) Base location and file name to create all the mongodb and json files that are created by the series of command prompts. This is recommended because without it all files are created in the current working directory. |
| -d | Database name to upsert all documents into a mongodb. |

This script expects that you have exported your bionavigator crosstab files seperately as median signal and median background. Both of these files are required for parsing to take place. This toolbox does not accept median signal - background combination files.

The _id field for mongo is generated for each of these files so it is the same for 'name' as it is for each level. This prevents multiple documents being created for a given _id in each collection.

This generates .json and .mdb files. The only difference is that the .json is an array so it can be imported directly into the toolbox, and the .mdb is documents seperated by newlines so it can be directly imported into the mongodb database with the following commands:

``` mongoimport --db <db_name> --collection <collection_name> --file <file_for_collection_name> ```

With older versions of node the Promise system is not well garbage collected. This can cause memory issues. To fix this run node with more memory:

`node --max-old-space-size=4096 index.js -...`

## Monogo with Restify

Skip to [Web Toolbox](#web-toolbox) if you are just interested in using the client side developer tools.

After following the instructions in [Getting Started](#getting-started-server-side) you can make sure the server will work by typing:

```node server.js```

If that works for you then just use your favorite forever program and type:

```forever <or pm2> start server.js```

And you have a database server set up.


## Web Toolbox

This toolbox is avaliable at: (http://toolbox.kinomecore.com) unfortunately for now you must be inside of UAB's network in order to gain access to the data. This will be changed soon.

There are three major components to the web toolbox:

1.  [Default Global Functions and Packages](#default-global-functions-and-packages) Functions availabe for use on every page created.
2.  [URL Parameter Options](#url-parameter-options) The URL itself is used to load data into the pages. This data determines the default packages loaded in. A list of these defaults along with a short description of each is [avaliable here](https://github.com/kinome/kinome_toolbox/tree/master/js/client/plugins). Additionally the URL can be used to load in scripts for the purpose of development.
3.  [Kinome Data Objects](#kinome-data-objects) These objects build the infrastructure of all the pages. There are several functions added to them that make working with them as simple as possible.

### Default Global Functions and Packages

Every page in this enviornment will have the following standard packages loaded in:

* [Google Charts](https://developers.google.com/chart/)
* [JQuery 3](https://jquery.com/)
* [Bootstrap 3](http://getbootstrap.com/) (Both JS and CSS)
* [Dexie](http://dexie.org/)
* [jqMath](http://mathscribe.com/author/jqmath.html)

In addition to this there are number default global functions and objects that are created.

<details>
<summary>require(<i>request</i> [,<i>type</i> [,<i>cache</i>]])</summary>

* #### require
   require works a lot like require in NodeJS, but instead of returning an object with properties attached, it returns a [JavaScript Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). This documentation got too verbose for this file. Please see [require readme](https://github.com/kinome/kinome_toolbox/blob/master/require.md) for more information and examples.

</details>

<details>
<summary>save(<i>file_content</i>, <i>file_name</i>)</summary>

* #### save
   save is a simple function, the first parameter is a string with the content of the file you would like to create. The second is a string with the file name you would like to create. These will be downloaded to the users prefered downloads folder.

</details>

<details>
<summary>KINOME.addAnalysis(<i>title</i>)</summary>

* #### KINOME.addAnalysis
   This function is passed a string and adds that string as an option to the dropdown menu 'Analyses Avaliable'. It returns a jQuery object that is the container avaliable to build your specific tool in.

</details>

<details>
<summary>KINOME.list(<i>list_string</i>)</summary>

* #### KINOME.list
   This lists the parameters avaliable for a follow up get from KINOME.get. At this time that includes:
  - names: a list of the barcode_array combinations present
  - groups: a list of the groups loaded in (0, 1, 2, ...)
  - levels: a list of the levels loaded in (name, level_1.0.0, ...)
  - ids: a list of the unique ids loaded in

   This will all be returned as an object if no parameters are added in, if a string matching one of the above is passed in it will return an array corresponding to the requested variable.

</details>

<details>
<summary>KINOME.get(<i>get_object</i>)</summary>

* #### KINOME.get
   The easiest way to use this function is to pass it nothing. It will then return an array of all the objects currently loaded in. These objects will be enriched. (See KINOME.enrich for more). Beyond this an object may be passed in with property names corresponding to the properties from KINOME.list. Each property may be passed either an array or a string and get will return an array of values that matches what was passed in.

</details>

<details>
<summary>KINOME.error(<i>error_obj, error_message</i>)</summary>

* #### KINOME.error
   This will console.error the error object and the error message. Additionally it creates a dismisable error message based on the error message passed in. This message may be either a string, html or jquery objects.

</details>

<details>
<summary>KINOME.warn(<i>warn_message</i>)</summary>

* #### KINOME.warn
   This will console.warn the message. Additionally it creates a dismisable warning message based on the warning passed in. This message may be either a string, html or jquery objects.

</details>

<details>
<summary>KINOME.alert(<i>alert_message</i>)</summary>

* #### KINOME.alert
   This will open a dismissible modal with the message you provide. If the modal is already open, it just updates the message. If it is closing as the message is passed in (or shortly after the message is passed in) it will re-open with the new message.

</details>

<details>
<summary>KINOME.formatEquation(<i>equation_str</i>)</summary>

* #### KINOME.formatEquation
   This takes a [jqMath](http://mathscribe.com/author/jqmath.html) string and converts it into the appropriate HTML for appending to the page.

</details>

<details>
<summary>KINOME.enrich(<i>data_object</i>)</summary>

* #### KINOME.enrich
   This is passed a JSON kinome object as outlined at [Swagger Hub KINOME](https://app.swaggerhub.com/apis/adussaq/KINOME/1.0.0). It returns the same object but with an additional series of functions. These functions include list, get, clone, stringify, and depending on the level: put and level_up. More information below at [Kinome Data Objects](#kinome-data-objects).

</details>

<details>
<summary>KINOME.loadData(<i>urls</i>)</summary>

* #### KINOME.loadData
   This is a specialized require function. It will accepts urls as an array of strings. The urls must be to arrays of kinome objects (lvl1, lvl2 or names). It has the added benifits of adding the results the the KINOME.params object so that KINOME.get and KINOME.list recognize it. Additionally it will KINOME.enrich the returned object. It returns a [JavaScript Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) which will pass the resultant object as an array to the then function.

</details>

<details>
<summary>KINOME.params</summary>

* #### KINOME.params
   This is the object that is parsed from the URL parameters passed in. It has a data array that has all data loaded in by group. A list of the scripts loaded in by the URL and an array of the strings loaded in my URL. For more on this see [URL Parameter Options](#url_parameter_options).

</details>

<details>
<summary>KINOME.page</summary>

* #### KINOME.page
   jQuery div for the contents of the 'home page' (This is the page that shows all currently loaded in information as a table and builds links to other data levels.)

</details>

### URL Parameter Options

We have two base URLs, one for the toolbox and one for images. They both accept query parameters. They are as follows:

http://toolbox.kinomecore.com/ [?params](#toolbox-parameters) (click "?params" to jump to details)

http://toolbox.kinomecore.com/image [?params](#image-parameters) (click "?params" to jump to details)

#### Toolbox Parameters

Starting from: http://toolbox.kinomecore.com/ we can add a large number of parameters. As is is the standard, the first parameter is indicated by a '?', all subsequent ones are seperated by an '&'.

* &data=\*\[ *data_url1* \[; *data_url2* \[; ... \] \] \]\*

   You can add any number of &data objects. They expect a list of data urls seperated by ';'. Spaces should be ignored, but it is best to just leave them out. All of these data urls should be [Kinome Data Objects](#kinome-data-objects).

   If multiple &data=\*\[...\]\* tags are utilized then those group numbers will be indicated on the data objects loaded in and as the group number from the KINOME.list function.

* &data=\*\[ *data_url1* \[| *data_url2* \[| ... \] \] \]\*

    This notation for *data_urls* works identically to the above expect if all URLs are from the same base then you can indicate only the end of the URL. For example: `&data=*[http://example.com/direc1/?param=param1;http://example.com/direc2/?param=param2;http://example.com/direc1/?param=param3]*` is identical to `&data=*[http://example.com/direc1/?param=param1|/direc2/?param=param2|?param=param3]*`.

* &code="*\<script_url\>*"

   Based on loading preferences this will be the last thing that loads. So all indicated data and text will be avaliable when this loads. This will allow you to develop an add on/plug in for the toolbox. Which can then be formalized by submitting the add on as a [pull request](https://github.com/kinome/kinome_toolbox/pulls). All add ons should be submitted as part of the [plugin's folder](https://github.com/kinome/kinome_toolbox/tree/master/plugins).

* &text="\<text_url\>"

   Our reccomendation is to utilize the (require function)[#default-global-functions-and-packages] in your script for this purpose, however this is supported and the results will be added to the KINOME.params.strings array. This is blocking, &code will not load until this resolves.

* &style="\<css_url\>"

   Our reccomendation is to utilize the (require function)[#default-global-functions-and-packages] in your script for this purpose, however this is supported and the results will loaded into the system as part of `<head>`. This is non-blocking as style will only change the appearance of the page not the functionality.

#### Image Parameters

Starting from: http://toolbox.kinomecore.com/ we can add parameters as described below.

* ?img="*\<image_file_name\>*"

   This will load in the image file indicated and alter the image for viewing online. It also provides a link to the original image file since the web version is low quality. [Example](http://toolbox.kinomecore.com/image/?img=%22631308612_W1_F1_T50_P154_I1285_A29%22)

### Kinome Data Objects

There are currently three major data types: names; level 1; level 2. The actual data models are described here: [Swagger Hub KINOME](https://app.swaggerhub.com/apis/adussaq/KINOME/1.0.0). However the power of this toolbox is that you do not need to know what these data objects look like. You only need the following series of functions and a general description of each data type.

#### Data Array

This is an enriched array containing some number of enriched KINOME objects. While this could have multiple types in theory, it has only been tested on individual types. The easiest way to get one of these is with a [KINOME.get()](#default-global-functions-and-packages) command, which returns an enriched array. The enriched array has the following functions:

<details>
<summary>data_arr.get(<i>get_object</i>)</summary>

* ##### data_arr.get(<i>get_object</i>)
   This can take as entry any of the parameters that return from an argumentless *data_arr.list()* call. It will iteratively call get functions on all members that match the main object filters (ie name or id) and return an array with all matching data points as objects. This and all data level get functions take an object with parameters pointing to either strings or arrays of strings and return an array will all matching points. The [client side getting started](#getting-started-client-side) provides an example of this.

   Each returned object can have functions attached, these are specifically described in the 'get' function for each type below.

</details>

<details>
<summary>data_arr.list(<i>list_string</i>)</summary>

* ##### data_arr.list(<i>list_string</i>)
   This will create an array for the matching list string option based on all possible options for a get function. If it is not given a list string it will return an object with all possible lists. The [client side getting started](#getting-started-client-side) provides an example of this function in action.

</details>

<details>
<summary>data_arr.clone()</summary>

* ##### data_arr.clone()
   This iteratively calls .clone() on all member objects. This clone is special in that it preserves the enrich functions and the non-enumerable properties.

</details>

<details>
<summary>data_arr.stringify()</summary>

* ##### data_arr.stringify()
   This calls JSON.stringify on all member objects, but only after going through and rounding all numbers to a six digit precision. The idea being that beyond that the data is not useful and the storage cost increases greatly.

</details>


The following are all specific entries in the data_arr above. Essentially if the first object in a data_arr (`data_arr[0]`) is of type 'Name' then it will have the functions described below on it. Additionally it will have a properperty `data_arr[0].level === 'name'`.


#### Name

This is just the meta data and peptide list for each data object loaded in. This data exists for quick load and for the building of down the line analytic groups. It has the following functions attached:

<details>
<summary>name.get(<i>get_object</i>)</summary>

* ##### name.get(<i>get_object</i>)
   This can take as entry any of the parameters that return from an argumentless *name.list()* call. It will return an array with all matching data points as objects. This and all data level get functions take an object with parameters pointing to either strings or arrays of strings and return an array will all matching points. The [client side getting started](#getting-started-client-side) provides an example of this function in action on a data_arr. It works identically here, just with different options.

</details>

<details>
<summary>name.list(<i>list_string</i>)</summary>

* ##### name.list(<i>list_string</i>)
   This will create an array for the matching list string option based on all possible options for a get function. If it is not given a list string it will return an object with all possible lists. The [client side getting started](#getting-started-client-side) provides an example of this function in action on a data_arr. It works identically here, just with different options.

</details>

<details>
<summary>name.clone()</summary>

* ##### name.clone()
   This clone is special in that it preserves the enrich functions and the non-enumerable properties.

</details>

<details>
<summary>name.stringify()</summary>

* ##### name.stringify()
   This calls JSON.stringify, but only after going through and rounding all numbers to a six digit precision. The idea being that beyond that the data is not useful and the storage cost increases greatly.

</details>


#### Level 1

Level 1 data is essentially base level data. It has not been parameterized and the only additions or alterations are based on the level 1.X.Y indications. These levels will be described in the supplement of a pending publication and in a future youtube video. (Links coming soon)

<details>
<summary>lvl1.get(<i>get_object</i>)</summary>

* ##### lvl1.get(<i>get_object</i>)
   This can take as entry any of the parameters that return from an argumentless *lvl1.list()* call. It will return an array with all matching data points as objects. This and all data level get functions take an object with parameters pointing to either strings or arrays of strings and return an array will all matching points. The [client side getting started](#getting-started-client-side) provides an example of this function in action on a data_arr. It works identically here, just with different options.

   Each returned object has 2 functions on it: A set function that sets the value of specific parameters in the base object and a more function that gives more information about the point itself.

  * set(*key*, *value*), sets the indicated key to the indicated value. Only works for 'background', 'background_valid', 'signal' and 'signal_valid'.
  * more(), returns the image index for the point and the full meta data array for the indicate peptide.

</details>

<details>
<summary>lvl1.list(<i>list_string</i>)</summary>

* ##### lvl1.list(<i>list_string</i>)
   This will create an array for the matching list string option based on all possible options for a get function. If it is not given a list string it will return an object with all possible lists. The [client side getting started](#getting-started-client-side) provides an example of this function in action on a data_arr. It works identically here, just with different options.

</details>

<details>
<summary>lvl1.level_up(<i>equation_string</i>)</summary>

* ##### lvl1.level_up(<i>equation_string</i>)
   This creates an empty level 2 object from the level 1 object scaffolding. It does not require, but it is highly recommended to pass it the equation string used for the parameterization of kinetic curves. [Example is found here](https://github.com/kinome/kinome_toolbox/blob/master/models/cyclingEq_3p_hyperbolic.jseq), but remove the extra spaces and comments using: `eq_string.replace(/\/\/[^\n]*/g, "").replace(/\s+/g, ' ')`. Relevent metadata and other crucial information is passed over. This resultant object can then be built up using `lvl2.put({put_object})`.

</details>

<details>
<summary>lvl1.put(<i>put_object</i>)</summary>

* ##### lvl1.put(<i>put_object</i>)
   This will add a data point to a level 1 object. It requires 6 parameters passed in as object properties. They are as follows
```JavaScript
        {
            valid: "boolean, true/false",
            value: "value to set, a number",
            type: "either signal or background, string",
            peptide: "peptide the value is for, string",
            cycle: "cycle number for value, null === post wash, number or null",
            exposure: "camera exposure time for value, null === cycle series, number or null"
        }
```
   As expected this will add that value/valid combination into the object. This works regardless of if the point exists already. However if it does, this will add it in using a lvl1.get call then a pnt.set call.

</details>

<details>
<summary>lvl1.clone()</summary>

* ##### lvl1.clone()
   This clone is special in that it preserves the enrich functions and the non-enumerable properties.

</details>

<details>
<summary>lvl1.stringify()</summary>

* ##### lvl1.stringify()
   This calls JSON.stringify, but only after going through and rounding all numbers to a six digit precision. The idea being that beyond that the data is not useful and the storage cost increases greatly.

</details>


#### Level 2

Level 2 data is parameterized level 1 data.  The slight variations on it are based on the origin level 1 data. These levels will be described in a future youtube video. (Links coming soon)

<details>
<summary>lvl2.get(<i>get_object</i>)</summary>

* ##### lvl2.get(<i>get_object</i>)
   This can take as entry any of the parameters that return from an argumentless *lvl2.list()* call. It will return an array with all matching data points as objects. This and all data level get functions take an object with parameters pointing to either strings or arrays of strings and return an array will all matching points. The [client side getting started](#getting-started-client-side) provides an example of this function in action on a data_arr. It works identically here, just with different options.

   Each returned object has 2 functions on it: A set function that sets the value of specific parameters in the base object and a more function that gives more information about the point itself.

  * set(*key*, *value*), sets the indicated key to the indicated value. Only works for background and signal as these are the only point determined parameters. You must set the entire object (`{R^2, WW, [params]}` for kinetic or `{R^2, [params]}` for linear).
  * more(), returns the image index for the point and the full meta data array for the indicate peptide.

</details>

<details>
<summary>lvl2.list(<i>list_string</i>)</summary>

* ##### lvl2.list(<i>list_string</i>)
   This will create an array for the matching list string option based on all possible options for a get function. If it is not given a list string it will return an object with all possible lists. The [client side getting started](#getting-started-client-side) provides an example of this function in action on a data_arr. It works identically here, just with different options.

</details>

<details>
<summary>lvl2.put(<i>put_object</i>)</summary>

* ##### lvl2.put(<i>put_object</i>)
   This will add a data point to a level 2 object. It requires 4 parameters passed in as object properties. They are as follows
```JavaScript
        {
            type: "required, describes type of fit, either linear or kinetic, string",
            peptide: "required, peptide the value is for, string",            
            

            signal: "optional [either this or background required], fit object",
            background: "optional [either this or signal required], fit object",

            
            exposure: "required if type === kinetic, otherwise ignored, camera exposure time for value, null === cycle series, number or null",
            cycle: "required if type === linear, otherwise ignored, cycle number for value, null === post wash, number or null"
        }
```
   As expected this will add that background/signal object into the main object. This works regardless of if the point exists. However if it does exist, this will add it in using a lvl2.get call then a pnt.set call.

</details>

<details>
<summary>lvl2.clone()</summary>

* ##### lvl2.clone()
   This clone is special in that it preserves the enrich functions and the non-enumerable properties.

</details>

<details>
<summary>lvl2.stringify()</summary>

* ##### lvl2.stringify()
   This calls JSON.stringify, but only after going through and rounding all numbers to a six digit precision. The idea being that beyond that the data is not useful and the storage cost increases greatly.

</details>

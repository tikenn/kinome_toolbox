# Welcome to the Kinome Toolbox

###### A platform for analysis and visualization of PamGene PamChip peptide arrays.

This toolbox has 3 distinct parts.

1. [File Parsing](#server-side-file-parsing) A small bit of node code that can be utilized to automatically parse a new file into all the different components and add them to the database.
2. [Hosting server](#monogo-with-restify) A server component made to host your own data. This is set up to run with just about any flavor of linux, it is the exact server configuration that we utilize (CentOS 7-3 and Ubuntu 16 tested).
3. [Web Toolbox](#web-toolbox) A series of client side JavaScript scripts that create the pages for the toolbox.

## Getting started (server side)

Skip to [Web Toolbox](#web-toolbox) if you are just interested in using the client side developer tools.

(Coming soon: Docker).

Download the repository with:

```git clone https://github.com/kinome/kinome_toolbox.git```

To get our updates you will have to issue a pull command from within the folder you downloaded the code base to.

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
| -d | (Coming Soon!) Database name to upsert all documents into a mongodb. |

This script expects that you have exported your bionavigator crosstab files seperately as median signal and median background. Both of these files are required for parsing to take place. This toolbox does not accept median signal - background combination files.

The _id field for mongo is generated for each of these files so it is the same for 'name' as it is for each level. This prevents multiple documents being created for a given _id in each collection.

This generates .json and .mdb files. The only difference is that the .json is an array so it can be imported directly into the toolbox, and the .mdb is documents seperated by newlines so it can be directly imported into the mongodb database with the following commands:

``` mongoimport --db <db_name> --collection <collection_name> --file <file_for_collection_name> ```

## Monogo with Restify

Skip to [Web Toolbox](#web-toolbox) if you are just interested in using the client side developer tools.

After following the instructions in [Getting Started](#getting-started-server-side) you can make sure the server will work by typing:

```node server.js```

If that works for you then just use your favorite forever program and type:

```forever <or pm2> start server.js```

And you have a database server set up.


## Web Toolbox

This toolbox is avaliable at: (http://toolbox.kinomecore.com) unfortunately for now you must be inside of UAB's network in order to gain access to the data. This will be changed soon.

### Default Global Functions and Packages

Every page in this enviornment will have the following standard packages loaded in:

* [Google Charts](https://developers.google.com/chart/)
* [JQuery 3](https://jquery.com/)
* [Bootstrap 3](http://getbootstrap.com/) (Both JS and CSS)
* [Dexie](http://dexie.org/)
* [jqMath](http://mathscribe.com/author/jqmath.html)

In addition to this there are number default global functions and objects that are created.

<details>
<summary>require(<i>url</i> [,<i>type</i> [,<i>cache</i>]])</summary>

* #### require
   require works a lot like require in NodeJS, but instead of returning an object with properties attached, it returns a [JavaScript Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). This promise will resolve when the script or other data has been loaded. If it is a text or json file, the then function will be passed the result, if it is a script or style element the then function will just be passed true.

   Additionally, when require is used in a module that only defines functions (example: [Peptide Picker](https://github.com/kinome/kinome_toolbox/blob/master/plugins/peptide_picker/peptide_picker.js)) there is no need to wait for the resolve in your file. They will resolve before your function does.
   
   Finally require caches everything except scripts. Text and JSON default to a 30 minute cache. If the system is getting specific documents from a mongodb instance these are cached for 90 days as are all style documents. 
   
   As for the actual parameters:  
  - *url*: (required) The url [string] to the actual script of interest, or a string that as defined by [require.defaults](https://github.com/kinome/kinome_toolbox/blob/master/js/client/web_namespace.js#L20). Automatic type dection assumes JavaScript unless the file ends with .txt, .css or .json or if type is overwritten by the second optional parameter. This may also be an array of strings. If you set a type with an array it will be utilized for all parts of that array.
  - *type*: (optional) Options: 'text, txt, string' (resolves as text); 'style, css' (resolves as style sheet), 'json, data', resolves as JSON.
  - *cache*: (optional) true/false for cacheing. If false then cache will clear and be replaced by the newest file. If true, then it will always pull from the cache when possible (with the same limits as above).

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
   This will console.error the error object and the error message. Additionally it creates a dismisable error message based on the error message passed in.

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

http://toolbox.kinomecore.com/ [?params](#toolbox_parameters) (click "?params" for details)

http://toolbox.kinomecore.com/image [?params](#image_parameters) (click "?params" for details)

#### Toolbox Parameters

Starting from: http://toolbox.kinomecore.com/ we can add a large number of parameters. As is is the standard, the first parameter is indicated by a '?', all subsequent ones are seperated by an '&'.

&data=\*\[ *data_url1* \[; *data_url2* \[; ... \] \] \]\*

#### Image Parameters

Image only accepts one parameter: ?img="*\<image_file_name\>*"

Starting from: http://toolbox.kinomecore.com/ we can add parameters as described below.

This will load in the image file indicated and alter the image for viewing online. It also provides a link to the original image file since the web version is low quality. [Example](http://toolbox.kinomecore.com/image/?img=%22631308612_W1_F1_T50_P154_I1285_A29%22)

### Kinome Data Objects

Coming soon, this will describe the objects by linking to [Swagger Hub KINOME](https://app.swaggerhub.com/apis/adussaq/KINOME/1.0.0) and talk about the enrichment functions.

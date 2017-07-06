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

Every page in this enviornment will have the following standard packages loaded in:

* [Google Charts](https://developers.google.com/chart/)
* [JQuery 3](https://jquery.com/)
* [Bootstrap 3](http://getbootstrap.com/) (Both JS and CSS)
* [Dexie](http://dexie.org/)
* [jqMath](http://mathscribe.com/author/jqmath.html)

In addition to this there are few default global functions that are created, and a few that are on the KINOME object.

<details>
<summary>require(<i>url</i> [,<i>type</i> [,<i>cache</i>]])</summary>

   require works a lot like require in NodeJS, but instead of returning an object with properties attached, it returns a [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise](JavaScript Promise). This promise will resolve when the script or other data has been loaded. If it is a text or json file, the then function will be passed the result, if it is a script or style element the then function will just be passed true.

   Additionally, when require is used in a module that only defines functions (example: [https://github.com/kinome/kinome_toolbox/blob/master/plugins/peptide_picker/peptide_picker.js](Peptide Picker)) there is no need to wait for the resolve in your file. They will resolve before your function does.

   Finally require caches everything except scripts. Text and JSON default to a 30 minute cache. If the system is getting specific documents from a mongodb instance these are cached for 90 days as are all style documents.

   As for the actual parameters: 

  - *url*: (required) The url [string] to the actual script of interest, or a string that as defined by [https://github.com/kinome/kinome_toolbox/blob/master/js/client/web_namespace.js#L20](require.defaults). Automatic type dection assumes JavaScript unless the file ends with .txt, .css or .json or if type is overwritten by the second optional parameter. This may also be an array of strings. If you set a type with an array it will be utilized for all parts of that array.
  - *type*: (optional) Options: 'text, txt, string' (resolves as text); 'style, css' (resolves as style sheet), 'json, data', resolves as JSON.
  - *cache*: (optional) true/false for cacheing. If false then cache will clear and be replaced by the newest file. If true, then it will always pull from the cache when possible (with the same limits as above).
</details>



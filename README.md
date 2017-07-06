# Welcome to the Kinome Toolbox

###### A platform for analysis and visualization of PamGene PamChip peptide arrays.

This toolbox has 3 distinct parts.

1. [File Parsing](#server-side-file-parsing) A small bit of node code that can be utilized to automatically parse a new file into all the different components and add them to the database.
2. [Hosting server](#monogo-with-restify) A server component made to host your own data. This is set up to run with just about any flavor of linux, it is the exact server configuration that we utilize (CentOS 7-3 and Ubuntu 16 tested).
3. [Web Toolbox](#web-toolbox)A bulkier series of client side JavaScript scripts that create the pages for the toolbox.

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

The _id field is generated for each of these files so it is the same for 'name' as it is for each level. This prevents multiple documents being created for a given _id in each collection.

This generates .json and .mdb files. The only difference is that the .json is an array so it can be imported directly into the toolbox, and the .mdb is documents seperated by newlines so it can be directly imported into the mongodb database with the following commands:

``` mongoimport --db <db_name> --collection <collection_name> --file <file_for_collection_name> ```
s
## Monogo with Restify

Skip to [Web Toolbox](#web-toolbox) if you are just interested in using the client side developer tools.

After following the instructions in [Getting Started](#getting-started-server-side) you can make sure the server will work by typing:

```node server.js```

If that works for you then just use your favorite forever program and type:

```forever <or pm2> start server.js```

And you have a database server set up.


## Web Toolbox


# Welcome to the Kinome Toolbox

###### A platform for analysis and visualization of PamGene PamChip peptide arrays.

This toolbox has 3 distinct parts.

1. [Hosting server](#monogo-with-restify) A server component made to host your own data. This is set up to run with just about any flavor of linux, it is the exact server configuration that we utilize (CentOS 7-3 and Ubuntu 16 tested).
2. [File Parsing](#server-side-file-parsing) A small bit of node code that can be utilized to automatically parse a new file into all the different components and add them to the database.
3. [Web Toolbox](#web-toolbox)A bulkier series of client side JavaScript scripts that create the pages for the toolbox.

## Getting started (server side)

Download the repository with:

```git clone https://github.com/kinome/kinome_toolbox.git```

To get our updates you will have to issue a pull command from within the folder you downloaded the code base to.

```git pull```

## Monogo with Restify

There are only three things missing from a full installation. All of these have to be installed globally.
1. A [mongodb](https://docs.mongodb.com/manual/installation/) instance. 
2. [Node and npm](https://nodejs.org/en/download/), (these come packaged together).
3. Either [forever](https://github.com/foreverjs/forever) or [pm2](http://pm2.keymetrics.io/) for making sure the server keeps running. (Coming soon: Docker).

Once those dependencies are met, you need to build the npm modules. Navigate to the folder that you have downloaded with the clone then type:

```npm install```

This will download all the local repositories that are needed for a working server and for the server side parsing. Unfortunately these are not currently seperable. If you are not installing the server side file parsing just installing resitfy (v4), assert, and mongodb would be sufficient.

Once this is done you can make sure the server will work by typing:

```node server.js```

If that works for you then just use your favorite forever program and type:

```forever start server.js```

And you should be good to go.

## Server Side File Parsing


## Web Toolbox


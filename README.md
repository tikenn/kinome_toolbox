# Welcome to the Kinome Toolbox

###### A platform for analysis and visualization of PamGene PamChip peptide arrays.

This toolbox has 3 distinct parts.

1. [Hosting server](#monogo-with-restify) A server component made to host your own data. This is set up to run with just about any flavor of linux, it is the exact server configuration that we utilize (CentOS 7-3 and Ubuntu 16 tested).
2. [File Parsing](#server-side-file-parsing) A small bit of node code that can be utilized to automatically parse a new file into all the different components and add them to the database.
3. [Web Toolbox](#web-toolbox)A bulkier series of client side JavaScript scripts that create the pages for the toolbox.

## Getting started (server side)

Skip to [Web Toolbox](#web-toolbox) if you are just interested in using the client side developer tools.

Download the repository with:

```git clone https://github.com/kinome/kinome_toolbox.git```

To get our updates you will have to issue a pull command from within the folder you downloaded the code base to.

```git pull```

There are only three things missing from a full installation. All of these have to be installed globally.
1. [Node and npm](https://nodejs.org/en/download/), (these come packaged together).
2. (Only required if you are hosting your own data.) A [mongodb](https://docs.mongodb.com/manual/installation/) instance.
3. (Only required if you are hosting your own data for external use.) Either [forever](https://github.com/foreverjs/forever) or [pm2](http://pm2.keymetrics.io/) for making sure the server keeps running. (Coming soon: Docker).

Once those dependencies are met, you need to build the npm modules. Navigate to the folder that you have downloaded with the clone then type:

```npm install```

This will download all the local repositories that are needed for a working server and for the server side parsing. Unfortunately these are not currently seperable.


## Monogo with Restify

Skip to [Web Toolbox](#web-toolbox) if you are just interested in using the client side developer tools.

After following the instructions in [Getting Started](#getting-started-server-side) you can make sure the server will work by typing:

```node server.js```

If that works for you then just use your favorite forever program and type:

```forever <or pm2> start server.js```

And you have a database server set up.

## Server Side File Parsing

Skip to [Web Toolbox](#web-toolbox) if you are just interested in using the client side developer tools.

After following the instructions in [Getting Started](#getting-started-server-side) you will be able to get this component up


## Web Toolbox


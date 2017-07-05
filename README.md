# Welcome to the Kinome Toolbox

###### A platform for analysis and visualization of PamGene PamChip peptide arrays.

This toolbox has 3 distinct parts.

1. [Hosting server](#Monogo-with-Restify) A server component made to host your own data. This is set up to run with a linux platform, it is the exact server configuration that we utilize.
2. [File Parsing](#Server-Side-File-Parsing) A small bit of node code that can be utilized to automatically parse a new file into all the different components and add them to the database.
3. [Web Toolbox](#Web-Toolbox)A bulkier series of client side JavaScript scripts that create the pages for the toolbox.

## Monogo with Restify

There are only two things missing from a full installation. Both of these have to be installed globally. (1) A mongodb instance and (2) either [forever](https://github.com/foreverjs/forever) or [pm2](http://pm2.keymetrics.io/) for making sure the server keeps running. (Coming soon: Docker).

## Server Side File Parsing


## Web Toolbox


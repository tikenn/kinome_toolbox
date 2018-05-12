(function () {
    'use strict';

    var MongoClient = require('mongodb').MongoClient, restify = require('restify'), assert = require('assert');//, ObjectId = require('mongodb').ObjectID;

    //Needs to impliment aggregate stuff (https://docs.mongodb.com/manual/reference/operator/aggregation/)
    //Need to impliment mapreduce stuff
    //Need to impliment projection stuff

    //Good source for operators:
    // https://docs.mongodb.com/manual/reference/operator/
    //I am making sure to not allow any operators that can change the documents
    // this is to ensure that this remains a query only server

    var acceptedRegex = "", sanatize, j, grabDbName, grabDocument,
            accepted$ = [
        "all", "and", "bitsAllClear", "bitsAllSet", "bitsAnyClear",
        "bitsAnySet", "collStats", "comment", "elemMatch",
        "eq", "exists", "explain", "geoIntersects", "geoWithin", "gt",
        "gte", "hint", "in", "limit", "lte", "match", "max", "maxScan",
        "maxTimeMS", "meta", "min", "mod", "natural", "ne", "near",
        "nearShpere", "nin", "nor", "not", "or", "orderby", "query",
        "regex", "returnKey", "showDiskLoc", "size", "skip", "slice",
        "snapshot", "text", "type", "where"
    ];


    for (j = 0; j < accepted$.length; j += 1) {
        acceptedRegex += "^\\$" + accepted$[j] + "$|";
    }
    acceptedRegex = acceptedRegex.replace(/\|$/, "");
    acceptedRegex = new RegExp(acceptedRegex, 'i');

    //define the query sanatize function
    //sanatize the query
    sanatize = function (query) {
        var keys, i;
        if (typeof query === "object") {
            keys = Object.keys(query);
            for (i = 0; i < keys.length; i += 1) {
                if (keys[i].match(/^\s*\$/)) {
                    //straight up kill it if it is not an accepted type
                    if (!keys[i].match(acceptedRegex)) {
                        delete query[keys[i]];
                    }
                } else if (typeof query[keys[i]] === "object") {
                    query[keys[i]] = sanatize(query[keys[i]]);
                }
            }
        } else {
            //If it is not an object then just query it all
            // should probably generate an error message
            query = {};
        }
        return query;
    };

    grabDbName = function (request, response) {
        var myDbName = request.params.db_name, query, fields, sort,
                collectionName = request.params.collection_name, url;

        //Deal with the objects
        // myDbName = myDbName || 'kinome';
        url = 'mongodb://localhost:27017/' + myDbName;
        console.log('db name:', myDbName);
        request.query.find = request.query.find || "{}";
        request.query.fields = request.query.fields || "-1";
        request.query.sort = request.query.sort || "[]";

        request.query.find = decodeURIComponent(request.query.find);
        request.query.fields = decodeURIComponent(request.query.fields);
        request.query.sort = decodeURIComponent(request.query.sort);

        //Objectify them
        query = JSON.parse(request.query.find);
        query = sanatize(query);
        fields = JSON.parse(request.query.fields);
        sort = JSON.parse(request.query.sort);

        //if there is a sort option, sanatize it
        if (sort.length > 0) {
            sanatize(sort);
        }

        //Start up connection and run the query
        MongoClient.connect(url, function (err, db) {
            assert.equal(null, err);
            var spec;
            var collection = db.collection(collectionName);
            console.log("Connected successfully to server");

            //options
            var limit = request.query.limit * 1 || 9000000; //9 mil more than enough
            var skip = request.query.skip * 1 || 0;
            var maxTimeMS = request.query.maxTimeMS * 1 || 1000 * 60 * 60; //1 hr

            //special stuff
            console.log(query, fields, sort);
            if (fields === -1) {
                spec = collection.find(query, {
                    limit: limit,
                    skip: skip,
                    maxTimeMS: maxTimeMS
                });
            } else {
                spec = collection.find(query, sanatize(fields), {
                    limit: limit,
                    skip: skip,
                    maxTimeMS: maxTimeMS
                });
            }

            //run the sort operation and then return the final result
            spec.sort(sort).toArray(function (err, docs) {
                assert.equal(err, null);
                console.log('Found docs');
               // console.log("Found the following records", docs);
                response.send(docs);
            });
        });
    };

    grabDocument = function (request, response) {
        var myDbName = request.params.db_name, fields,
                collectionName = request.params.collection_name,
                query = {id: decodeURIComponent(request.params.doc_id)}, url;

        //Deal with the objects
        // myDbName = myDbName || 'kinome';
        url = 'mongodb://localhost:27017/' + myDbName;
        request.query.fields = request.query.fields || "-1";
        request.query.fields = decodeURIComponent(request.query.fields);

        //Objectify them
        query = sanatize(query);
        fields = JSON.parse(request.query.fields);

        //Start up connection and run the query
        MongoClient.connect(url, function (err, db) {
            assert.equal(null, err);
            var spec;
            var collection = db.collection(collectionName);
            console.log("Connected successfully to server");

            //options
            var maxTimeMS = request.query.maxTimeMS * 1 || 1000 * 60 * 60; //1 hr

            //special stuff
            console.log(query, myDbName, collectionName);
            if (fields === -1) {
                spec = collection.find({"_id": query.id}, {
                    maxTimeMS: maxTimeMS
                });
            } else {
                spec = collection.find({"_id": query.id}, sanatize(fields), {
                    maxTimeMS: maxTimeMS
                });
            }

            //run the sort operation and then return the final result
            spec.toArray(function (err, docs) {
                assert.equal(err, null);
                console.log('Found docs');
                //console.log("Found the following records", docs);
                //Only return the first object
                if (docs[0]) {
                    response.send(docs[0]);
                } else {
                    response.send(undefined);
                }
            });
        });
    };

    //sets up the server stuff
    var server1 = restify.createServer({
        accept: ['application/json', 'image/tif', 'image/png', 'text/plain']
    });
    server1.use(restify.queryParser());
    server1.use(restify.CORS({}));

    server1.get(/\/img\/kinome\/?.*/, restify.serveStatic({
        directory: "/var/www"
    }));
    server1.get(/\/file\/affymetrix\/?.*/, restify.serveStatic({
        directory: "/var/www/global_files"
    }));

    //http://138.26.31.155:8000/img/kinome/631308613_W1_F1_T200_P154_I1313_A30.tif

    /*the following is for the internal db (accesible as a registered UAB user only)*/
    server1.get("/db/:db_name/:collection_name", grabDbName);
    server1.get("/db/:db_name/:collection_name/:doc_id", grabDocument);
    server1.listen(8000, function () {
        console.log('%s listening at %s', server1.name, server1.url);
    });


    // var server2 = restify.createServer({
    //     accept: ['application/json', 'image/tif', 'image/png']
    // });
    // server2.use(restify.queryParser());
    // server2.use(restify.CORS({}));

    // server2.get(/\/img\/kinome\/?.*/, restify.serveStatic({
    //     directory: "./server_imgs"
    // }));



    // /*The following is for the external db*/
    // server2.get("/1.0.0/:collection_name", grabDbName);
    // server2.get("/1.0.0/:collection_name/:doc_id", grabDocument);
    // server2.listen(8080, function () {
    //     console.log('%s listening at %s', server2.name, server2.url);
    // });

}());

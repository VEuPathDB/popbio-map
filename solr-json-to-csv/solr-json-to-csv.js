'use strict';


const spanwProcess = require('child_process'),
    fs = require('fs'),
    url = require('url'),
    express = require('express'),
    createError = require('http-errors');

const app = express();


/*
 * Returns true if the request satisfies the following conditions:
 *  - HTTP method (eg. GET,POST,..) is not in options.invalidHttpMethods
 *  - Path (eg. /solr/update) is in options.validPaths
 *  - All request query params (eg ?q=, ?stream.url=) not in options.invalidParams
 */
var validateRequest = function (request, options) {
    var parsedUrl = url.parse(request.url, true),
        path = parsedUrl.pathname,
        queryParams = Object.keys(parsedUrl.query);


    // console.log(JSON.stringify(parsedUrl));
    // console.log(parsedUrl.pathname);
    // console.log(options.validPaths.indexOf(parsedUrl.pathname));

    return options.invalidHttpMethods.indexOf(request.method) === -1 &&
        options.validPaths.indexOf(path) !== -1 &&
        queryParams.every(function (p) {
            var paramPrefix = p.split('.')[0]; // invalidate not just "stream", but "stream.*"
            //console.log(paramPrefix);
            return options.invalidParams.indexOf(paramPrefix) === -1;
        });
};


// default options
var defaultOptions = {
    listenPort: 8000,
    invalidHttpMethods: ['POST'],
    validPaths: ['/solr/vb_popbio/smplExport', '/solr/vb_popbio/irExport', '/solr/vb_popbio/abndExport', '/solr/vb_popbio/genoExport'],
    invalidParams: ['qt', 'stream'],
    backend: {
        host: 'localhost',
        port: 7997
    },
    validator: validateRequest
};

var options = defaultOptions;


/*
 * Merge user-supplied options with @defaultOptions*.
 */
// var mergeDefaultOptions = function(defaultOptions, options) {
//     var mergedOptions = {};
//
//     options = options || {};
//     options.backend = options.backend || {};
//     mergedOptions.invalidHttpMethods = options.invalidHttpMethods || defaultOptions.invalidHttpMethods;
//     mergedOptions.validPaths = options.validPaths || defaultOptions.validPaths;
//     mergedOptions.invalidParams = options.invalidParams || defaultOptions.invalidParams;
//     mergedOptions.backend = options.backend || {};
//     mergedOptions.backend.host = options.backend.host || defaultOptions.backend.host;
//     mergedOptions.backend.port = options.backend.port || defaultOptions.backend.port;
//     mergedOptions.validator = options.validator || defaultOptions.validator;
//
//     return mergedOptions;
// };


app.get('/solr/vb_popbio/*', function (req, res, next) {
    // console.log(req.url);
    var parsedUrl = url.parse(req.originalUrl, true),
        path = parsedUrl.pathname,
        fields = ['all'];

    if (parsedUrl.query.fl) {
        fields = parsedUrl.query.fl.split(',');
    }
    //console.log(fields);
    var fUrl;

    if (options.validator(req, options)) {

        fUrl = 'http://' + options.backend.host + ':' + options.backend.port + req.url;
        var childProcess = spanwProcess.fork('child.js', [fUrl, path, fields], {silent: true});

    } else {
        return next(createError(403, 'Invalid SOLR request'));
    }


    // Events
    childProcess.on('message', function (data) {
        if (data.type == 0) {
            res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="export.csv";',
            });
            this.stdout.pipe(res);

        } else if (data.type == 1) {

            childProcess.shutdown();
            return next(createError(400, 'Bad request', {SolrResponse: data.response}));

        } else {
            childProcess.shutdown();
            return next(createError(500, 'Internal Server Error', {expose: false}));

        }
    });

// Helper function added to the child process to manage shutdown.
    childProcess.onUnexpectedExit = function (code, signal) {
        console.log("Child process terminated with code: " + code + ' ' + signal);
    };

    childProcess.on("exit", childProcess.onUnexpectedExit);

    // A helper function to shut down the child.
    childProcess.shutdown = function () {
        // Get rid of the exit listener since this is a planned exit.
        this.removeListener("exit", this.onUnexpectedExit);
        this.kill("SIGTERM");
    };


// SIGTERM AND SIGINT will trigger the exit event.
    process.once("SIGTERM", function () {
        process.exit(0);
    });
    process.once("SIGINT", function () {
        process.exit(0);
    });
// And the exit event shuts down the child.
    process.once("exit", function () {
        childProcess.shutdown();
    });

// This is a somewhat ugly approach, but it has the advantage of working
// in conjunction with most of what third parties might choose to do with
// uncaughtException listeners, while preserving whatever the exception is.
    process.once("uncaughtException", function (error) {
        // If this was the last of the listeners, then shut down the child and rethrow.
        // Our assumption here is that any other code listening for an uncaught
        // exception is going to do the sensible thing and call process.exit().
        if (process.listeners("uncaughtException").length === 0) {
            childProcess.shutdown();
            throw error;
        }
    });


});

// Error handler
app.use(errorHandler);

app.listen(options.listenPort);

//TODO: handle errors without status code
function errorHandler(err, req, res, next) {
    res.status(err.statusCode);
    res.send(err.message);
}

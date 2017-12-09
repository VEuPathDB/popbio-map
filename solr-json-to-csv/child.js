/**
 * Created by Ioann on 20/7/2016.
 */

"use strict";

const request = require('request'),
    jsonCsv = require('json-csv'),
    jsonStream = require('JSONStream'),
    fields = require('./fields.js');

var stream = jsonStream.parse('*.docs.*');

// stream.on('data', function(data) {
//     console.log('value:', data);
// });


var url = process.argv[2];
var path = process.argv[3];

//options for JSON to CSV module
var options = {};
if (/irExport$/.test(path)) {
    options.fields = fields.ir;
} else if (/abndExport$/.test(path)) {
    options.fields = fields.abnd;
} else if (/genoExport$/.test(path)) {
    options.fields = fields.geno;
} else {
    options.fields = fields.smpl;
}
options.convert = process.argv[4];

// console.log("path = "+path+" and fields = "+options.convert+" and url = "+url);

request
    .get(url)
    .on('error', function (err) {
        process.send({type: 2, error: err})
    })
    .on('response', function (response) {
        // console.log(response.statusCode); // 200
        if (response.statusCode == 200) {
            process.send({type: 0, response: response})
        } else {
            process.send({type: 1, response: response})


        }
    })
    .pipe(stream)
    .pipe(jsonCsv.csv(options))
    .pipe(process.stdout);


stream.on('end', function () {
    // console.log('End of stream, exiting now');
    // process.exit(0);
    process.exitCode = 0;
});

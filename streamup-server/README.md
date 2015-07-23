StreamUp-Server
=========

A generic server wrapper for StreamUp to support creating your own StreamUp server with REST-interface.

## Installation

  npm install streamup-server --save

## Usage

var StreamUp 				= require('StreamUp'),
	StreamUpServer			= require('StreamUpServer');

var tripleStore 	= TripleStoreLevelGraph('metadata', { joinAlgorithm: 'basic' });
var timeSeriesStore = TimeSeriesStoreLemDB('timeseries');
var streamUp 		= StreamUp(	tripleStore, 
								timeSeriesStore, 
								function(input) {
									return "http://example.com" + input.id;
								},
								function(input) {
									return { 
										subject: "http://example.com" + input.id,
										predicate "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
										object: "http://example.com/Sensor"
								}});

var streamUpServer 	= StreamUpServer(streamUp, {port: 8080});

streamUpServer.on('start', function() {	
	tripleStore.clear()		
};

var handlers =
[
	{
		type			: 'post',
		url				: 'sensors/create',
		options			: StreamUpServer.UrlOptions.parseBody,		
		target			: streamUp.createSensor.bind(streamUp),
		parseParameter	: function(req) {
							return 	{
										deviceId: req.body.deviceId, 
										sensorId: req.body.sensorId,
										metadata: req.body.metadata, 
										format: req.body.format
									};
						   },
		handleResult	: function(err, result) {							
							if (err) {
								return { code: 500, body: err };
							} else {
								return { code: 200, body: result };
							};
						  }
	},
];

streamUpServer.start(handlers);

## Tests

  npm test

## Release History

* 0.1.0 Initial release

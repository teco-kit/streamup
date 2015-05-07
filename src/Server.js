

var StreamUp 				= require('./StreamUp.js'),
	TripleStoreLevelGraph 	= require('./TripleStoreLevelGraph.js'),
	TimeSeriesStoreLemDB	= require('./TimeSeriesStoreLemDB.js'),
	StreamUpServer			= require('./StreamUpServer.js'),
	Ontology		= require('./SmartTecoOntology');

var Q 					= require('q');

var PORT 				= 8080;

var HttpResponse = {
    OK				: 200,
    BadRequest 		: 400,
    InternalError   : 500    
};


var tripleStore 	= TripleStoreLevelGraph('metadata');
var timeSeriesStore = TimeSeriesStoreLemDB('timeseries');
var streamUp 		= StreamUp(tripleStore, timeSeriesStore, function(sensor) {	
	var device = Ontology.getDevice(sensor.deviceID);
		sensor = Ontology.getSensor(sensor.deviceID, sensor.sensorID);
	return {	
		// check if all needed parameters are there			
		uri		: sensor.uri,
		triples : Ontology.getTriples(device, sensor)
	}
});

var streamUpServer 	= StreamUpServer(streamUp, {port: PORT});

var handlers = [ 
	{
		type			: 'post',
		url				: '/create',
		options			: StreamUpServer.UrlOptions.parseBody,
		target			: streamUp.createSensor.bind(streamUp),
		parseParameter	: function(req) {
							return {deviceID: req.body.deviceID, sensorID: req.body.sensorID};
						   },
		handleResult	: function(err, result) {							
							if (err) {
								return { code: HttpResponse.InternalError, body: err };
							} else {
								return { code: HttpResponse.OK, body: result };
							};
						  }
	},
	{
		type			: 'put',
		url				: '/devices/:deviceID/sensors/:sensorID/values',
		options			: StreamUpServer.UrlOptions.parseQuery,
		target			: streamUp.insertValues.bind(streamUp),
		parseParameter	: function(req) {
							return {
										sensor: 
											{
												deviceID: req.params.deviceID, 
												sensorID: req.params.sensorID
											},
										data: 	[{value: req.params.value, timestamp: req.params.timestamp}]
									}
						   },
		handleResult	: function(err, result) {							
							if (err) {
								return { code: HttpResponse.InternalError, body: err };
							} else {
								return { code: HttpResponse.OK, body: result };
							}							;
						  }
	},
	{
		type			: 'post',
		url				: '/query',
		options			: StreamUpServer.UrlOptions.parseQuery,
		target			: streamUp.query.bind(streamUp),
		parseParameter	: function(req) {
							return req.body;
						   },
		handleResult	: function(err, result) {							
							if (err) {
								return { code: HttpResponse.InternalError, body: err };
							} else {
								return { code: HttpResponse.OK, body: result };
							}							;
						  }
	},
	{
		type			: 'get',
		url				: '/devices/:deviceID/sensors/:sensorID/values',
		options			: StreamUpServer.UrlOptions.parseQuery,
		target			: streamUp.getValues.bind(streamUp),
		parseParameter	: function(req) {
							return {
										sensor: 
											{
												deviceID: req.params.deviceID, 
												sensorID: req.params.sensorID
											},
										start: 	req.params.start,
										end: 	req.params.end
									}
						   },
		handleResult	: function(err, result) {							
							if (err) {
								return { code: HttpResponse.InternalError, body: err };
							} else {
								return { code: HttpResponse.OK, body: result };
							}							;
						  }
	}
	]

streamUpServer.on('start', function() {	
	tripleStore.clear()
		.then(function() {
			return timeSeriesStore.clear();
		})	
		.then(tripleStore.insertFromFile({file: 'data/smartteco.n3', format: 'N3'}))
		.done();
})
streamUpServer.start(handlers);

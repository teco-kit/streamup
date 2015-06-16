

var StreamUp 				= require('./StreamUp.js'),
	TripleStoreLevelGraph 	= require('./TripleStoreLevelGraph.js'),
	TimeSeriesStoreLemDB	= require('./TimeSeriesStoreLemDB.js'),
	StreamUpServer			= require('./StreamUpServer.js'),
	Ontology				= require('./SmartTecoOntology');

var Q 					= require('q');

var PORT 				= 8080;

var HttpResponse = {
    OK				: 200,
    BadRequest 		: 400,
    InternalError   : 500    
};


var tripleStore 	= TripleStoreLevelGraph('metadata');
var timeSeriesStore = TimeSeriesStoreLemDB('timeseries');
var streamUp 		= StreamUp(	tripleStore, 
								timeSeriesStore, 
								Ontology.getSensorUri,
								Ontology.getTriples
);

var streamUpServer 	= StreamUpServer(streamUp, {port: PORT});

var handlers = [ 
	{
		type			: 'post',
		url				: '/create',
		options			: StreamUpServer.UrlOptions.parseBody,
		target			: streamUp.createSensor.bind(streamUp),
		parseParameter	: function(req) {
							return {deviceId: req.body.deviceId, sensorId: req.body.sensorId};
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
		url				: '/devices/:deviceId/sensors/:sensorId/values',
		options			: StreamUpServer.UrlOptions.parseQuery,
		target			: streamUp.insertValues.bind(streamUp),
		parseParameter	: function(req) {
							return {
										sensor: 
											{
												deviceId: req.params.deviceId, 
												sensorId: req.params.sensorId
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
		options			: StreamUpServer.UrlOptions.parseBody,
		target			: streamUp.query.bind(streamUp),
		parseParameter	: function(req) {
							return req.body;
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
		type			: 'get',
		url				: '/devices/:deviceId/sensors/:sensorId/values',
		options			: StreamUpServer.UrlOptions.parseQuery,
		target			: streamUp.getValues.bind(streamUp),
		parseParameter	: function(req) {
							return {
										sensor: 
											{
												deviceId: req.params.deviceId, 
												sensorId: req.params.sensorId
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
		.then(function(result) {
			console.log('tripleStore cleared (' + result.noSuccessfully  + '/' + result.noTotal + ' triples delete successfully)');
		})
		.catch(function(err) {
			console.log('error clearing tripleStore (' + err + ')');
		})
		.then(timeSeriesStore.clear.bind(timeSeriesStore, null))
		.then(function() {
			console.log('timeSeriesStore cleared successfully')
		})
		.catch(function(err) {
			console.log('error clearing timeSeriesStore (' + err + ')');
		})
		.then(tripleStore.insertFromFile.bind(tripleStore, {file: 'data/smartteco.n3', format: 'N3'}))
		.then(function(options) { 			
			return tripleStore.getAllTriples()
					.then(function(triples) {		
						if (triples) {
							console.log(triples.length + " triples inserted from file '" + options.file +"'");
						} else {
							console.log("no triples found to insert in file '" + options.file +"'");
						}
						
					})
					.catch(function(err, data) {
						console.log("error inserting RDF from file '" + data.file + "'");		
					});
		}) 
		.done();
});

streamUpServer.start(handlers);

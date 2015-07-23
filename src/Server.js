

var StreamUp 				= require('./StreamUp.js'),
	TripleStoreLevelGraph 	= require('./TripleStoreLevelGraph.js'),
	TimeSeriesStoreLemDB	= require('./TimeSeriesStoreLemDB.js'),
	StreamUpServer			= require('./StreamUpServer.js'),
	Ontology				= require('./SmartTecoOntology'),
	utils 					= require('./Utils.js');

var Q 					= require('q');

var PORT 				= 8080;

var HttpResponse = {
    OK				: 200,
    BadRequest 		: 400,
    InternalError   : 500    
};


var tripleStore 	= TripleStoreLevelGraph('metadata', { joinAlgorithm: 'basic' });
var timeSeriesStore = TimeSeriesStoreLemDB('timeseries');
var streamUp 		= StreamUp(	tripleStore, 
								timeSeriesStore, 
								Ontology.getSensorUri,
								Ontology.getSensorTriples
);

var streamUpServer 	= StreamUpServer(streamUp, {port: PORT});

var prepareMetadata = function(metadata, format, replacements, callback) {
	var deferred = Q.defer();	
	if (metadata) {
		if (utils.isObject(metadata)) { 
			metadata = JSON.stringify(metadata);
		}
		Object.keys(replacements).forEach(function (key) {
   			// need to escape ? is key
   			metadata = metadata.replace(new RegExp(key.replace(/\?/g, '\\?'), 'g'), replacements[key]);
		});		
		utils.parseRDF(metadata, format, function(err, triples) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(triples);
			}
		})											
	} else {
		deferred.reject();
	}
	return deferred.promise.nodeify(callback);
}

var triplesExists = function(triples, callback) {
	var deferred = Q.defer();	
	streamUp._tripleStore.query.bind(streamUp._tripleStore)(triples, function(err, data) {
		if (err) {
			deferred.reject(err);
		} else {
			deferred.resolve(data.length > 0)
		}
	});
	return deferred.promise.nodeify(callback);
}

var deviceExists = function(deviceId, callback) {
	triplesExists(Ontology.getDeviceTriples(deviceId), callback);	
}

var sensorExists = function(deviceId, sensorId, callback) {
	triplesExists(Ontology.getSensorTriples(deviceId, sensorId), callback);	
}

var handlers = [ 
	// ##### create device
	{
		type			: 'post',
		url				: 'devices/create',
		options			: StreamUpServer.UrlOptions.parseBody,
		// create device here
		target			: function(options, callback) {
							console.log('options: ' + JSON.stringify(options));
							var deferred = Q.defer();	

							// do proper function call to prepare metadata
							prepareMetadata(options.metadata, options.format, {"?device" : Ontology.getDeviceUri(options.deviceId)}, function(err, metadata) {
								if (err) {
									deferred.reject(err);
								} else {
									// check  device exists
									// query onotology with device triples
									var triples = Ontology.getDeviceTriples(options.deviceId);
									deviceExists(options.deviceId, function(err, exists) {
										if (err || exists) {
											deferred.reject("device already exists!");
										} else {
											// create device
											streamUp._tripleStore.insertTriples.bind(streamUp._tripleStore)(triples, function(err, result) {
												// handle metadata													
												if (metadata) {
													//insert metadata
													streamUp._tripleStore.insertTriples.bind(streamUp._tripleStore)(metadata, function(err, metaResult) {
														if (err) {
															// inserting metadata failed - rollback creation of device
															streamUp._tripleStore.deleteTriples.bind(streamUp._tripleStore)(triples, function(err, result) {
																deferred.reject(err);
															});															
														} else {
															// add metadata to triples created and return
															result = result.concat(metaResult);
															deferred.resolve(result);
														}		
													});
												} else {
													deferred.resolve(triples);
												}
											});
										}
									})									
								}
							})							
							return deferred.promise.nodeify(callback);
						  },
		parseParameter	: function(req) {
							return 	{
										deviceId: req.body.deviceId, 
										metadata: req.body.metadata, 
										format: req.body.format
									};
						   },
		handleResult	: function(err, result) {							
							if (err) {
								return { code: HttpResponse.InternalError, body: err };
							} else {
								return { code: HttpResponse.OK, body: result };
							};
						  }
	},
	// ##### create sensor
	{
		type			: 'post',
		url				: 'sensors/create',
		options			: StreamUpServer.UrlOptions.parseBody,		
		target			: function(options, callback) {
							var deferred = Q.defer();	
							prepareMetadata(options.metadata, options.format, {"?sensor" : Ontology.getSensorUri(options)}, function(err, metadata) {
								options.metadata = metadata;
								if (err) {
									deferred.reject(err);
								} else {
									deviceExists(options.deviceId, function(err, exists) {
										if (err || !exists) {
											deferred.reject(err || 'device does not exist');
										} else {
											// check sensor exists
											streamUp.createSensor.bind(streamUp)(options, function(err, result) {
												if (err) {
													deferred.reject(err);
												} else {
													deferred.resolve(result);
												}
											});
										}
									})
								}
							});
							return deferred.promise.nodeify(callback);							
						  },
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
								return { code: HttpResponse.InternalError, body: err };
							} else {
								return { code: HttpResponse.OK, body: result };
							};
						  }
	},	
	// ##### insert values
	{
		type			: 'put',
		url				: '/devices/:deviceId/sensors/:sensorId/values',
		options			: StreamUpServer.UrlOptions.parseQuery,
		target			: streamUp.insertValues.bind(streamUp),
		parseParameter	: function(req) {
							var data = [];
							if (req.body) {
								if (utils.isArray(req.body)) {
									data = req.body;
								} else if (utils.isObject(req.body)) {
									data = [req.body];
								} else {
									data = [{value : req.body}]
								}
							} else {
								data = [{value: req.params.value, timestamp: req.params.timestamp}];
							}
							console.log('inserting data: ' + JSON.stringify(data));
							return {
										sensor: 
											{
												deviceId: req.params.deviceId, 
												sensorId: req.params.sensorId
											},
										data: data
									}
						   },
		handleResult	: function(err, result) {							
							if (err) {
								return { code: HttpResponse.InternalError, body: err };
							} else {
								return { code: HttpResponse.OK, body: result };
							};
						  }
	},
	// ##### query
	{
		type			: 'post',
		url				: '/query',
		options			: StreamUpServer.UrlOptions.parseBody,
		target			: streamUp.query.bind(streamUp),
		parseParameter	: function(req) {
							var contentType = req.header('Accept');
							var options = {};
							if (contentType) {
								options.format = contentType;
							}							
							return [req.body, options];
						   },
		handleResult	: function(err, result) {							
							if (err) {
								return { code: HttpResponse.InternalError, body: err };
							} else {
								return { code: HttpResponse.OK, body: result };
							};  
						  } 
	},
	// ##### get values
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

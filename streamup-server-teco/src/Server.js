var StreamUp 				= require('streamup').StreamUp,
	TripleStoreLevelGraph 	= require('streamup').TripleStoreLevelGraph,
	TimeSeriesStoreLemDB	= require('streamup').TimeSeriesStoreLemDB,
	StreamUpServer			= require('streamup-server'),
	Ontology				= require('./SmartTecoOntology'),
	utils 					= require('streamup').Utils,
	Q 						= require('q');

var HttpResponse = {
    OK				: 200,
    BadRequest 		: 400,
    InternalError   : 500    
};

// helper functions


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
	this._streamUp._tripleStore.query.bind(this._streamUp._tripleStore)(triples, function(err, data) {
		if (err) {
			deferred.reject(err);
		} else {
			deferred.resolve(data.length > 0)
		}
	});
	return deferred.promise.nodeify(callback);
}

var deviceExists = function(deviceId, callback) {
	triplesExists.bind(this)(Ontology.getDeviceTriples(deviceId), callback);	
}

var sensorExists = function(deviceId, sensorId, callback) {
	triplesExists(Ontology.getSensorTriples(deviceId, sensorId), callback);	
}

// public constructor
module.exports = function(options){
	options = options || {};
	options.metadata = options.metadata || 'metadata';
	options.timeseries = options.timeseries || 'timeseries';
	options.port = options.port || 8080;	
	return new StreamUpServerTeco(options);
}

// private constructor
function StreamUpServerTeco(options){
	this._tripleStore 		= TripleStoreLevelGraph(options.metadata, { joinAlgorithm: 'basic' });
	this._timeSeriesStore 	= TimeSeriesStoreLemDB(options.timeseries);
	this._streamUp 			= StreamUp(	this._tripleStore, 
										this._timeSeriesStore, 
										Ontology.getSensorUri,
										Ontology.getSensorTriples);
	this._streamUpServer 	= StreamUpServer(this._streamUp, {port: options.port});
	this._handlers = 
	[ 
		// ##### create device
		{
			type			: 'post',
			url				: 'devices/create',
			options			: StreamUpServer.UrlOptions.parseBody,
			// create device here
			target			: function(options, callback) {
								var deferred = Q.defer();	
								// do proper function call to prepare metadata
								prepareMetadata(options.metadata, options.format, {"?device" : Ontology.getDeviceUri(options.deviceId)}, function(err, metadata) {									
									if (err) {
										deferred.reject(err);
									} else {
										// check  device exists
										// query onotology with device triples
										var triples = Ontology.getDeviceTriples(options.deviceId);
										deviceExists.bind(this)(options.deviceId, function(err, exists) {
											if (err || exists) {
												deferred.reject("device already exists!");
											} else {
												// create device												
												this._streamUp._tripleStore.insertTriples.bind(this._streamUp._tripleStore)(triples, function(err, result) {
													// handle metadata													
													if (metadata) {
														//insert metadata
														this._streamUp._tripleStore.insertTriples.bind(this._streamUp._tripleStore)(metadata, function(err, metaResult) {
															if (err) {
																// inserting metadata failed - rollback creation of device
																this._streamUp._tripleStore.deleteTriples.bind(this._streamUp._tripleStore)(triples, function(err, result) {
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
										}.bind(this))									
									}
								}.bind(this))							
								return deferred.promise.nodeify(callback);
							  }.bind(this),
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
												this._streamUp.createSensor.bind(this._streamUp)(options, function(err, result) {
													if (err) {
														deferred.reject(err);
													} else {
														deferred.resolve(result);
													}
												});
											}
										}.bind(this))
									}
								}.bind(this));
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
			target			: this._streamUp.insertValues.bind(this._streamUp),
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
			target			: this._streamUp.query.bind(this._streamUp),
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
			target			: this._streamUp.getValues.bind(this._streamUp),
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
								};
							  }
		}
	]	
	}

StreamUpServerTeco.prototype.loadFromFile = function(file, callback) {	
	return this._tripleStore.insertFromFile({file: file, format: 'N3'})
			.then(function(options) { 			
				return this._tripleStore.getAllTriples()
						.then(function(triples) {		
							if (triples) {
								console.log(triples.length + " triples inserted from file '" + file +"'");
							} else {
								console.log("no triples found to insert in file '" + file +"'");
							}
							
						})
						.catch(function(err, data) {
							console.log("error inserting RDF from file '" + file + "'");		
						});
			}.bind(this)) 
			.nodeify(callback);
};

StreamUpServerTeco.prototype.clear = function(callback) {	
	return this._tripleStore.clear()			
			.then(function(result) {
				console.log('tripleStore cleared (' + result.noSuccessfully  + '/' + result.noTotal + ' triples delete successfully)');
			})
			.catch(function(err) {
				console.log('error clearing tripleStore (' + err + ')');
			})
			.then(this._timeSeriesStore.clear.bind(this._timeSeriesStore, null))
			.then(function() {
				console.log('timeSeriesStore cleared successfully')
			})
			.catch(function(err) {
				console.log('error clearing timeSeriesStore (' + err + ')');
			})		
			.nodeify(callback);
};


StreamUpServerTeco.prototype.start = function(options, callback) {	
	var deferred = Q.defer();	
	this._streamUpServer.start(this._handlers, function(err, result) {
		if(err) {
			deferred.reject(err);
		} else {
			this.clear(function(err, result) {
				if (err) {
					deferred.reject(err);
				} else {
					this.loadFromFile('data/smartteco.n3', function(err, result) {
						if(err) {
							deferred.reject(err);
						} else {
							deferred.resolve(result);
						}
					})
				}
			}.bind(this))
		}
	}.bind(this));
	return deferred.promise.nodeify(callback);
};

StreamUpServerTeco.prototype.stop = function(options, callback) {	
	var deferred = Q.defer();	
	this._streamUpServer.stop(null, function(err, result) {
		if(err) {
			deferred.reject(err);
		} else {
			deferred.resolve(result);
		}
	});
	return deferred.promise.nodeify(callback);
};

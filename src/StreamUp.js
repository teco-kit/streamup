var	utils	= require('./Utils.js'),
	Q 		= require('q'),
	JsonLD	= require('jsonld');
	
var ITripleStore = new utils.Interface('ITripleStore', 
	[
		'insertTriple', 
		'insertTriples',
		'deleteTriple',
		'deleteTriples',
		'insert',
		'insertFromFile',
		'getAllTriples',
		'clear',
		'query'
	]);

var ITimeSeriesStore = new utils.Interface('ITimeSeriesStore', 
	[
		'createIndex', 
		'removeIndex', 
		'clear',
		'getValues',
		'getLatestValue',
		'insertValue',
		'insertValues',
		'deleteValue',
		'deleteValues',
		'deleteValuesByTime'
	]);	

module.exports = function(tripleStore, timeSeriesStore, getSensorUri, getSensorTriples){
	if(!tripleStore){
		throw new Error('tripleStore is required!');
	}
	if(!timeSeriesStore){
		throw new Error('timeSeriesStore is required!');
	}
	if(!getSensorUri || !utils.isFunction(getSensorUri)){
		throw new Error("getSensorUri is required and must be of type 'function'!");
	}
	if(!getSensorTriples || !utils.isFunction(getSensorTriples)){
		throw new Error("getSensorTriples is required and must be of type 'function'!");
	}
	utils.Interface.ensureImplements(tripleStore, ITripleStore);
	utils.Interface.ensureImplements(timeSeriesStore, ITimeSeriesStore);
	
	return new StreamUp(tripleStore, timeSeriesStore, getSensorUri, getSensorTriples);
}

function StreamUp(tripleStore, timeSeriesStore, getSensorUri, getSensorTriples){
	var self = this

	this._tripleStore = tripleStore;
	this._timeSeriesStore = timeSeriesStore;
	this._getSensorUri = getSensorUri;
	this._getSensorTriples = getSensorTriples;
}


StreamUp.prototype.createSensor = function(sensor, callback) {
	var errorMessage = "could not create sensor, reason: ";	
	if (!sensor) {
		throw new Error(errorMessage + "'sensor' is required");
	}		
	var deferred = Q.defer();	
	// create time series index
	this._timeSeriesStore.createIndex({index: this._getSensorUri(sensor)}, function(err, index) {
		if (err) {
			deferred.reject(errorMessage + err);
		} else {
			// generate triples for sensor	
			var triples = this._getSensorTriples(sensor)
			// insert triples
			this._tripleStore.insertTriples(triples, function(err) {
				if (err) {
					// rollback index creation
					this._timeSeriesStore.removeIndex({index: this._getSensorUri(sensor)}, function(e, index) {	
						deferred.reject(errorMessage + err);
					});
				} else {					
					if (sensor.metadata) {
						// insert metadata into triplestore
						this._tripleStore.insertTriples(sensor.metadata, function(err) {
							if (err) {
								// rollback insert triples and create index
								this._tripleStore.deleteTriples(triples, function(e) {
									this._timeSeriesStore.removeIndex({index: this._getSensorUri(sensor)}, function(e, index) {	
										deferred.reject(errorMessage + err);
									});
								});
							} else {
								deferred.resolve(triples.concat(sensor.metadata));
							}
						});
					} else {
						deferred.resolve(triples);
					}
				}	
			}.bind(this))		
		}
	}.bind(this))
	return deferred.promise.nodeify(callback);
}

StreamUp.prototype.insertValues = function(options, callback) {
	var errorMessage = "could not insert values, reason: ";	
	if (!options.sensor) {
		throw new Error(errorMessage + "invalid argument '" + JSON.stringify(options) + "' must contain property 'sensor'");
	}	
	if (!options.data || !utils.isArray(options.data)) {
		throw new Error(errorMessage + "invalid argument '" + JSON.stringify(options) + "' must contain property 'data' of type 'array'");
	}	
	return Q(this._getSensorUri(options.sensor))
			.then(function(sensorUri) {
				return this._timeSeriesStore.insertValues( { index: sensorUri, data: options.data });
			}.bind(this))
			.catch(function(err) {
				return Q.reject(errorMessage + err);
			})
			.nodeify(callback);
}

StreamUp.prototype.getValues = function(options, callback) {	
	var errorMessage = "could not get values for sensor, reason: ";	
	if (!options.sensor) {
		throw new Error(errorMessage + "invalid argument '" + JSON.stringify(options) + "' must contain property 'sensor'");
	}		
	return Q(this._getSensorUri(options.sensor))
			.then(function(sensorUri) {
				return this._timeSeriesStore.getValues( { index: sensorUri, start: options.start, end: options.end });
			}.bind(this))
			.catch(function(err) {
				return Q.reject(errorMessage + err);
			})
			.nodeify(callback);
	
}

StreamUp.prototype.getLatestValue = function(options, callback) {
	var errorMessage = "could not get latest value for sensor, reason: ";	
	if (!options.sensor) {
		throw new Error(errorMessage + "invalid argument '" + JSON.stringify(options) + "' must contain property 'sensor'");
	}		
	return Q(this._getSensorUri(options.sensor))
			.then(function(sensorUri) {
				return this._timeSeriesStore.getLatestValue(sensorUri);
			}.bind(this))
			.catch(function(err) {
				return Q.reject(errorMessage + err);
			})
			.nodeify(callback);
}

var projectVariables = function(data, projectedVariables, callback) {
	var deferred = Q.defer();
	var resultVars = [];
	if (projectedVariables && utils.isArray(projectedVariables)) {
		resultVars = projectedVariables;
	} else if (utils.isString(projectedVariables) && projectedVariables.substring(0,1) == '?'){
		resultVars.push(projectedVariables);
	}

	if (resultVars.length > 0) {
		var result = data.map(function(current) {
			Object.keys(current).forEach(function(variable) {
				if (resultVars.indexOf(variable) == -1) {
					delete current[variable];
				}
			});
			return current;
		});
		deferred.resolve(result);
	} else {
		// if no variables are selected return all
		deferred.resolve(data);
	}		
	return deferred.promise.nodeify(callback);
}

var applyConstructTemplate = function(data, template, callback) {
	var deferred = Q.defer();
	if (!template || !utils.isArray(template)) {
		throw new Error(errorMessage + "invalid argument 'query.template' must be non-null and of type 'array'");
	}
	var result = [];
	data.forEach(function(current) {
		// copy template for each entry
		var templateCopy = JSON.parse(JSON.stringify(template));
		// for all variables in result
		Object.keys(current).forEach(function(variable) {
			// for each triple of template
			templateCopy.forEach(function(triple) {
				// for subject/predicate/object
				Object.keys(triple).map(function(key) {
					if (utils.isString(triple[key]) && triple[key].substring(0,1) == '?' && triple[key] == variable) {
						triple[key] = current[variable];
					}
				});	
			})
		});
		Array.prototype.push.apply(result,templateCopy);
	});
	resolve(result);
	return deferred.promise.nodeify(callback);
}

var applyJSONFraming = function(triples, frame, callback) {
	var deferred = Q.defer();
	utils.toJSONLDObject(data, function(err, jsonld){	
		if (err) {
			deferred.reject(err);
		} else {
			JsonLD.frame(jsonld, frame, function(err, framed) {
			if (err) {
				deferred.reject(err);
			} else {				
				utils.parse(JSON.stringify(framed), 'application/ld+json', function(err, result) {
					if (err) {
						deferred.reject(err);
					} else {
						deferred.resolve(result);
					}
				})
			}
		})
		}
	});
	return deferred.promise.nodeify(callback);	
}

var prepareQuery = function(query, callback) {
	var deferred = Q.defer();
	// check triples for surrounding <...> brackets and remove them
	query.triples.forEach(function(triple) {
		Object.keys(triple).forEach(function(key) {
			if (triple[key].charAt(0) == '<' && triple[key].slice(-1) == '>') {
				triple[key] = triple[key].slice(1, -1);
			}
		});
	})
	deferred.resolve(query);
	return deferred.promise.nodeify(callback);		
}

StreamUp.prototype.query = function(query, options, callback) {	
	var deferred = Q.defer();
	var resultHandler = function(triples, options) {				
	    if (options.format) {	    		    	
			utils.toRDF(triples, options.format, function(err, result) {				
				if(err){
					deferred.reject(errorMessage + err);
				} else {					
	    			deferred.resolve(result);
	    		}
			})
		} else {
			deferred.resolve(triples);
		}
	};
	var errorMessage = "could not find sensors, reason: ";		
	if (!query) {
		deferred.reject(new Error(errorMessage + "invalid argument 'query' must be non-null"));
	}	
	if (!query.triples || !utils.isArray(query.triples)) {
		deferred.reject(new Error(errorMessage + "invalid argument 'query.triples' must be non-null and of type 'array'"));
	}
	prepareQuery(query, function(err, query) {
		this._tripleStore.query(query.triples, function(err, plainResult) {
			if (err) {
				deferred.reject(err);
			} else {			
				switch(query.type) {
			    	case 'SELECT':	   
			    		projectVariables(plainResult, query.variables, callback);					
				        break;
				    case 'CONSTRUCT':
				    	// convert to JSONLD, apply framing, convert back to triples		
				    	//if (query.frame && options.format == 'application/ld+json') {	    	
				    	applyConstructTemplate(plainResult, query.template, function(err, triples) {
				    		if (err) {
				    			deferred.reject(errorMessage + err);
				    		} else {
				    			if (query.frame) {
					    			applyJSONFraming(triples, query.frame, function(err, result) {
					    				if (err) {
					    					def.reject(errorMessage + err);
					    				} else {
					    					deferred.resolve(result);
					    				}
					    			});
					    		} else {
					    			deferred.resolve(triples);
					    		}
				    		}
				    	})
				        break;
					case 'TEMPLATE':
						deferred.reject(new Error(errorMessage + "TEMPLATE not implemented yet!"));    
				        break;	        
				    default:
				    deferred.reject(new Error(errorMessage + "invalid argument 'query.type' must be one of 'SELECT', 'CONSTRUCT', 'TEMPLATE'"));    
				}
			}				
		});	
	}.bind(this))	
	return deferred.promise.nodeify(callback);
}

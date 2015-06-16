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
	return Q(function() {								
				return this._timeSeriesStore.createIndex.bind(null, {index: this._getSensorUri(sensor)});
			}.bind(this))
			.then(function() {			
				return Q(this._getSensorTriples(sensor))
						.then(function(triples) {						
							return this._tripleStore.insertTriples(triples);
						}.bind(this))
			}.bind(this))	
			.catch(function(err) {
				return Q.reject(errorMessage + err);
			})
			.nodeify(callback);
}

StreamUp.prototype.insertValues = function(options, callback) {
	var errorMessage = "could not create sensor, reason: ";	
	if (!options.sensor) {
		throw new Error(errorMessage + "invalid argument '" + JSON.stringify(options) + "' must contain property 'sensor'");
	}	
	if (!options.data || !utils.isArray(options.data)) {
		throw new Error(errorMessage + "invalid argument '" + JSON.stringify(options) + "' must contain property 'data' of type 'array'");
	}	
	return Q(this._getSensorUri(options.sensor))
			.then(function(sensor) {
				return this._timeSeriesStore.insertValues( { index: sensor.uri, data: options.data });
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
			.then(function(sensor) {
				return this._timeSeriesStore.getValues( { index: sensor.uri, start: options.start, end: options.end });
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
			.then(function(sensor) {
				return this._timeSeriesStore.getLatestValue(sensor.uri);
			}.bind(this))
			.catch(function(err) {
				return Q.reject(errorMessage + err);
			})
			.nodeify(callback);
}

StreamUp.prototype.query = function(query, callback) {	
	
	var deferred = Q.defer();
	var errorMessage = "could not find sensors, reason: ";		
	if (!query) {
		deferred.reject(new Error(errorMessage + "invalid argument 'query' must be non-null"));
	}	
	if (!query.triples || !utils.isArray(query.triples)) {
		deferred.reject(new Error(errorMessage + "invalid argument 'query.triples' must be non-null and of type 'array'"));
	}
	this._tripleStore.query(query.triples, function(err, plainResult) {
		if (err) {
			deferred.reject(err);
		} else {			
			switch(query.type) {
		    	case 'SELECT':	      
					var resultVars = [];
					if (query.variables && utils.isArray(query.variables)) {
						resultVars = query.variables;
					} else if (utils.isString(query.variables) && query.variables.substring(0,1) == '?'){
						resultVars.push(query.variables);
					}
 
			    	if (resultVars.length > 0) {
			    		var result = plainResult.map(function(current) {
			    			Object.keys(current).forEach(function(variable) {
			    				if (resultVars.indexOf(variable) == -1) {
			    					delete current[variable];
			    				}
			    			});
			    			return current;
			    		});
			    		deferred.resolve(result);
			    	} else {
			    		deferred.resolve(plainResult);
			    	}					   				   
			        break;
			    case 'CONSTRUCT':
			    	if (!query.template || !utils.isArray(query.template)) {
			    		throw new Error(errorMessage + "invalid argument 'query.template' must be non-null and of type 'array'");
			    	}
			    	var result = [];
			    	plainResult.forEach(function(current) {
			    		// copy template for each entry
			    		var template = JSON.parse(JSON.stringify(query.template));
			    		// for all variables in result
			    		Object.keys(current).forEach(function(variable) {
			    			// for each triple of template
			    			template.forEach(function(triple) {
			    				// for subject/predicate/object
			    				Object.keys(triple).map(function(key) {
									if (utils.isString(triple[key]) && triple[key].substring(0,1) == '?' && triple[key] == variable) {
										triple[key] = current[variable];
									}
								});	
			    			})
			    		});
			    		Array.prototype.push.apply(result,template);
			    	});
			    	// convert to JSONLD, apply framing, convert back to triples

			    	// first convert result to string and from string to JSOND-LD
			    	utils.formatTriples(result, 'application/ld+json', function(err, jsonld) {
						if (err) {
							deferred.reject(err);
						} else {					
							if (query.frame) {
								JsonLD.frame(jsonld, query.frame, function(err, framed) {
									if (err) {
										deferred.reject(err);
									} else {
										utils.JSONLDtoTriples(framed, function(err, result) {
											if (err) {
												deferred.reject(err);
											} else {
												deferred.resolve(result);	
											}
										})
										
									}
								})
							} else {
								deferred.resolve(jsonld);
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
	return deferred.promise.nodeify(callback);
}

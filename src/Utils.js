var N3 		= require('n3'),
	Q 		= require('q');



module.exports.isString = function(string) {
	return Object.prototype.toString.call(string) === '[object String]';
}

module.exports.isObject = function(object) {
	return typeof object === 'object';
}

module.exports.isArray = function(array) {
	return Object.prototype.toString.call( array ) === '[object Array]';
}

module.exports.isFunction = function(func) {
	return typeof func === 'function';
}

function _formatTriples(triples, format) {
	var deferred = Q.defer();	
	var writer = N3.Writer({ format: format });
	writer.addTriples(triples);
	writer.end(function (err, result) { 
		if (err) {
			deferred.reject(err);
		} else {			
			deferred.resolve(result);
		}
	});
	return deferred.promise.nodeify(callback);
}

module.exports.formatTriples = function(triples, format, callback) {
	var errorMessage = "error formatting triples: ";
	var deferred = Q.defer();
	var convertFunction;
	switch(format) {
		case 'text/turtle':
			convertFunction = _formatTriples.bind(null, triples, format);
			break;
		case 'application/n-triples':
		case 'N-Triples':
			convertFunction = _formatTriples.bind(null, triples, 'N-Triples');
			break;
		case 'application/trig':
			convertFunction = _formatTriples.bind(null, triples, format);
			break;		
		case 'application/ld+json':
			convertFunction = triplesToJSONLD.bind(null, triples);
			break;		
		case 'application/rdf+xml':
			throw "format '" + format + "' not supported yet!"
			break;
		default: {
			deferred.reject(errorMessage + "unknown format '" + format + "'")
		}
	}	
	if (convertFunction) {
		convertFunction(function(err, result) {
			if (err) {
				deferred.reject(errorMessage + err);
			} else {
				deferred.resolve(result);
			}
		})
	} 	
	return deferred.promise.nodeify(callback);
};

module.exports.triplesToJSONLD = function(triples) {
	var deferred = Q.defer();
	utils.formatTriples(triples, 'N-Triples', function(err, rdf) {						
		if (err) {
			deferred.reject(err);
		} else {					
			JsonLD.fromRDF(rdf, {format: 'application/nquads'}, function(err, jsonld) {
				if (err) {
					deferred.reject(err);
				} else {		
					// use framing
					if (query.frame) {
						JsonLD.frame(jsonld, query.frame, function(err, framed) {
							if (err) {
								deferred.reject(err);
							} else {
								deferred.resolve(framed);
							}
						})
					} else {
						deferred.resolve(jsonld);
					}
				}
			});
		}
	});
	return deferred.promise.nodeify(callback);
};


module.exports.JSONLDtoTriples = function(jsonld) {
	var deferred = Q.defer();
	JsonLD.toRDF(jsonld, {format: 'application/nquads'}, function(err, rdf) {
		if (err) {
			deferred.reject(err);
		} else {
			var parser = N3.Parser();
			var result = [];
			parser.parse(rdf, function(err, triple, prefixes) {
				if (err) {
					deferred.reject(err);
				} else {
					if (triple) {
						result.push(triple);
					} else {
						deferred.resolve(result);
					}
				}
			});
		}		
	})
	return deferred.promise.nodeify(callback);
};

var Interface = function (objectName, methods) {
	if (arguments.length != 2) {
		throw new Error ("Interface constructor called with " + arguments.length + "arguments, but expected exactly 2.");
	}

	this.name = objectName;
	this.methods = [];
 
	for (var i = 0, len = methods.length; i < len; i++) {
		if (typeof methods[i] !== 'string') {
			throw new Error ("Interface constructor expects method names to be " + "passed in as a string.");
		}

		this.methods.push(methods[i]);
	}
};
 
Interface.ensureImplements = function (object) {
	if (arguments.length < 2) {
		throw new Error ("Interface.ensureImplements was called with " + arguments.length + "arguments, but expected at least 2.");
	}
 
	for (var i = 1, len = arguments.length; i < len; i++) {
		var interface = arguments[i];
		if (interface.constructor !== Interface) {
			throw new Error ("Interface.ensureImplements expects the second argument to be an instance of the 'Interface' constructor.");
		}

		for (var j = 0, methodsLen = interface.methods.length; j < methodsLen; j++) {

			var method = interface.methods[j];
 
			if (!object[method] || typeof object[method] !== 'function') {
				throw new Error ("This Class does not implement the '" + interface.name + "' interface correctly. The method '" + method + "' was not found.");
			}
		}
	}
};

exports.Interface = Interface;

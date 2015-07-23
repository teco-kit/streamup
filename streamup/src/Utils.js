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

//###########################

function parseJSONLD(string, callback) {
	// ???
	var temp = JSON.parse(string)
	console.log('as JSON-LD: ' + JSON.stringify(temp));
	callback(null, temp);
}

function _parseRDF(string, format, callback) {
	var deferred = Q.defer();
	var parser = N3.Parser({format: format});
	var result = [];
	parser.parse(string, function(err, triple, prefixes) {
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
	return deferred.promise.nodeify(callback);
}

// parses a string in given format to SPO objects
module.exports.parseRDF = function(string, format, callback) {	
	var errorMessage = "error parsing triples '" + string + "' to format '" + format + "'";
	var deferred = Q.defer();
	console.log("parsing '" + string + "' as '" + format + "'");
	if (!utils.isString(string)) {
		deferred.resolve(string);
	}
	var convertFunction;	
	switch(format) {					
		case 'application/n-triples':
			format = 'N-Triples';
		case 'text/turtle':
		case 'N-Triples':
		case 'application/trig':
			_parseRDF(string, format, function(err, result) {
				if (err) {
					deferred.reject(err);
				} else {
					deferred.resolve(result);
				}
			})			
			break;		
		case 'application/ld+json':
			// from string to JSON-LD objects
			var json = JSON.parse(string);
			// from JSON-LD object to string of nquads
			JsonLD.toRDF(json, {format: 'application/nquads'}, function(err, nquads) {
				// from string of nquads to SPO objects
				_parseRDF(nquads, 'application/nquads', function(err, result) {
					if (err) {
						deferred.reject(err);
					} else {
						deferred.resolve(result);
					}	
				})
			});
			break;		
		case 'application/rdf+xml':
			throw "format '" + format + "' not supported yet!"
			break;
		case 'application/spo+json':
			deferred.resolve(JSON.parse(string));
		default: {
			// by default try parsing
			deferred.resolve(JSON.parse(string));
		}
	}	
	return deferred.promise.nodeify(callback);
}


function _toRDF(triples, format, callback) {	
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

module.exports.toJSONLDObject = function(triples, callback) {
	var deferred = Q.defer();
	// ensure current format is nquads because jsonld lib can only parse nquads
	_toRDF(triples, 'application/nquads', function(err, nquads) {
		if (err) {
			deferred.reject(errorMessage + err);
		} else {
			JsonLD.fromRDF(nquads, {format: 'application/nquads'}, function(err, result) {
				if (err) {
					deferred.reject(errorMessage + err);
				} else {
					deferred.resolve(result);
				}
			});
		}
	});
	return deferred.promise.nodeify(callback);
}

// converts SPO objects to string with output format
module.exports.toRDF = function(triples, format, callback) {
	// use {subject, predicate, object} as intermediate format
	var errorMessage = "error converting '" + JSON.stringify(triples) + "' to format '" + format + "'";
	var deferred = Q.defer();	
	 switch(format) {
	 	case 'application/n-triples':
		case 'N-Triples':
			format = 'N-Triples';
		case 'text/turtle':
		case 'application/trig':
			convertFunction = _toRDF.bind(null, triples, format);
			break;		
		case 'application/ld+json':
			convertFunction = utils.toJSONLDObject.bind(null, triples);			
			break;		
		case 'application/rdf+xml':
			throw "format '" + format + "' not supported yet!"
			break;
		case 'application/spo+json':
			// do nothing - probably JSON.strinify(triples) to ensure string formating
			//break;
		default: {
			// do nothing
			convertFunction = function(callback) {
				callback(null, triples);
			}
		}
	}
	convertFunction(function(err, result) {
		if (err) {
			deferred.reject(errorMessage + err);
		} else {							
			// ensure string formation
			if (utils.isObject(result)) {
				result = JSON.stringify(result);
			}
			deferred.resolve(result);
		}
	});	
	return deferred.promise.nodeify(callback);
}

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

module.exports.Interface = Interface;

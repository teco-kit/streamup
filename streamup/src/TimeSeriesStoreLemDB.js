var lem 				= require('lem'),
	level 				= require('level-browserify'), // using level-browserify instead of level to work with browserify
	Q 					= require('q'),
	through 			= require('through'),
	utils				= require('./Utils.js');
	

module.exports = function(db, options){

	if(!db){
		throw new Error('db required')
	}

	options = options || {}

	return new Store(db, options);
}

function Store(db, options){
	var self = this

	this._db = db
	this._options = options
	this._leveldb			= level(db);
	this._lemdb 			= lem(this._leveldb)
}

Store.prototype.getIndexSearchKey = function(index) {
	//throw new Error('not implemented yet! Needs to be fixed but how?!');
	// split by last / or even # ???
	//console.log("'getIndexSearchKey' not implemented yet! Needs to be fixed but how?!");	
	return {prefix: index.substring(0,index.lastIndexOf('/')), key: index.substring(index.lastIndexOf('/')+1)};
}


function indexExists(index, callback) {	
	var deferred = Q.defer();
	var exists = false;
	key = this.getIndexSearchKey(index);
	this._lemdb.keys(key.prefix).pipe(through(function(data){		
        if (data.key == key.key) {        	
        	exists = true;
        }
    }, function(){
        deferred.resolve(exists);
    }));
    return deferred.promise.nodeify(callback);
}

function formatTimestamp(timestamp) {
	return parseInt(timestamp, 10);
}

function parseTimestamp(timestamp) {
	if (!timestamp) {
		return timestamp;
	}
	width = 32 - timestamp.toString().length;
	if ( width > 0 )
	{
	return new Array( width + (/\./.test( timestamp ) ? 2 : 1) ).join( '0' ) + timestamp;
	}
	return timestamp + ""; // always return a string
}

Store.prototype.removeIndex = function(options, callback) {
	var errorMessage = "could not remove index '" + options.index + "', reason: ";
	var deferred = Q.defer();
	if (!options.index || !utils.isString(options.index)) {
		deferred.reject(errorMessage + "invalid argument '" + JSON.stringify(options) + "' must contain property 'index' of type 'string'");
	}		
	indexExists.call(this, options.index, function(err, result) {
		if (err) {
			deferred.reject(errorMessage + err);
		} else {
			if (result) {
				deferred.resolve(true);
			} else {
				this._lemdb.remove(options.index, function(err) {										
					if (err) {
						deferred.reject(err);
					} else {
						deferred.resolve(true);
					}
				}.bind(this));
			}
		}
	}.bind(this));
	return deferred.promise.nodeify(callback);
}

Store.prototype.createIndex = function(options, callback) {
	var errorMessage = "could not create index '" + options.index + "', reason: ";
	var deferred = Q.defer();
	if (!options.index || !utils.isString(options.index)) {
		deferred.reject(errorMessage + "invalid argument '" + JSON.stringify(options) + "' must contain property 'index' of type 'string'");
	}	
	if (!options.metadata) {
		options.metadata = 'none';
	}	
	//indexExists.call(this, options.index, function(err, result) {
	indexExists.call(this, options.index, function(err, result) {
		if (err) {
			deferred.reject(errorMessage + err);
		} else {
			if (result) {
				deferred.reject(errorMessage + "index already exists");
			} else {
				this._lemdb.index(options.index, options.metadata, function(err) {										
					if (err) {
						deferred.reject(err);
					} else {
						deferred.resolve(options.index);
					}
				}.bind(this));
			}
		}
	}.bind(this));
	return deferred.promise.nodeify(callback);
}

Store.prototype.getLatestValue = function(index, callback) {
	throw new Error('not implemented yet!');
}

Store.prototype.getValues = function(options, callback) {
	var deferred = Q.defer();
	if (!options.index || !utils.isString(options.index)) {
		deferred.reject(new Error("Invalid argument '" + JSON.stringify(options) + "' must contain property 'index' of type 'string'"));
	}	
	var result = [];
	this._lemdb.valuestream(options.index, {
	    start : parseTimestamp(options.start),
	    end : parseTimestamp(options.end)
	}).pipe(through(function(data){
	    result.push({ value: data.value,
	    			  timestamp: formatTimestamp(data.key)});
	}, function(){
	    deferred.resolve(result);
	}));
	return deferred.promise.nodeify(callback);
}

Store.prototype.insertValue = function(options, callback) {		
	var errorMessage = "could not insert value for index '" + options.index + "', reason: ";	
	if (!options.index || !utils.isString(options.index)) {
		throw new Error(errorMessage + "invalid argument '" + JSON.stringify(options) + "' must contain property 'index' of type 'string'");
	}	
	if (!options.data || !utils.isObject(options.data)) {
		throw new Error(errorMessage + "invalid argument '" + JSON.stringify(options) + "' must contain property 'data' of type 'object'");
	}	
	if (!options.data.value) {
		throw new Error(errorMessage + "invalid argument '" + JSON.stringify(options) + "' must contain property 'data.value'");
	}	
	return indexExists.call(this, options.index)
			.then(function(exists) {
				var deferred = Q.defer();
				if (!exists) {
					deferred.reject(errorMessage + 'index does not exist');
				} else {
					if (!options.data.timestamp) {
						options.data.timestamp = Math.floor(new Date().getTime() / 1000);
					}
					this._lemdb.recorder(options.index)(options.data.value, parseTimestamp(options.data.timestamp), function(err) {
							if (err) {
								deferred.reject(errorMessage + err);
							} else {
								deferred.resolve(options);
							}
						});	 					
				}
				return deferred.promise.nodeify(callback);
			}.bind(this));
}

Store.prototype.deleteValue = function(options, callback) {
	throw new Error('operation not supported!');
}

Store.prototype.deleteValues = function(options, callback) {
	throw new Error('operation not supported!');
}

Store.prototype.deleteValuesByTime = function(options, callback) {
	throw new Error('operation not supported!');
}

Store.prototype.insertValues = function(options, callback) {		
	var errorMessage = "could not insert values for index '" + options.index + "', reason: ";	
	if (!options.index || !utils.isString(options.index)) {
		throw new Error(errorMessage + "invalid argument '" + JSON.stringify(options) + "' must contain property 'index' of type 'string'");
	}	
	if (!options.data || !utils.isArray(options.data)) {
		throw new Error(errorMessage + "invalid argument '" + JSON.stringify(options) + "' must contain property 'data' of type 'array'");
	}	
	var jobs = options.data.map(function(data) {
		return this.insertValue({index: options.index, data: data}, null);
	}.bind(this));

	return Q.allSettled(jobs)
			.then(function(results) {
				var insertedValues = [];
				results.forEach(function(result) {
					if (result.state == 'fulfilled') {
						insertedValues = insertedValues.concat(result.value.data);
					}
				})
				return insertedValues;
			})
			.catch(function(err) {
				return Q.reject(errorMessage + err);
			})
			.nodeify(callback);
}

Store.prototype.clear = function(options, callback) {
	var errorMessage = "could not clear database, reason: ";	
	var deferred = Q.defer();	
	this._lemdb.close();
	this._leveldb.close(function(err) {
		if (err) {
			deferred.reject(errorMessage + err);
		} else {
			level.destroy(this._db, function(err) {
				if (err) {
					deferred.reject(errorMessage + err);
				} else {				
					this._leveldb.open(function(err) {
						if(err) {
							deferred.reject(errorMessage + err);
						} else {
							this._lemdb.open(function(err) {
								if (err)	 {
									deferred.reject(errorMessage + err);
								}else {
									deferred.resolve();
								}
							});
							
						}
					}.bind(this))
				}
			}.bind(this));
		}
	}.bind(this));
	return deferred.promise.nodeify(callback);
}
var	utils	= require('./Utils.js'),
	Q 		= require('q');
	
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

module.exports = function(tripleStore, timeSeriesStore, parseSensor){
	if(!tripleStore){
		throw new Error('tripleStore is required!');
	}
	if(!timeSeriesStore){
		throw new Error('timeSeriesStore is required!');
	}
	if(!parseSensor || !utils.isFunction(parseSensor)){
		throw new Error("parseSensor is required and must be of type 'fcuntion'!");
	}
	utils.Interface.ensureImplements(tripleStore, ITripleStore);
	utils.Interface.ensureImplements(timeSeriesStore, ITimeSeriesStore);
	
	return new StreamUp(tripleStore, timeSeriesStore, parseSensor);
}

function StreamUp(tripleStore, timeSeriesStore, parseSensor){
	var self = this

	this._tripleStore = tripleStore;
	this._timeSeriesStore = timeSeriesStore;
	this._parseSensor = parseSensor;	
}


StreamUp.prototype.createSensor = function(sensor, callback) {
	var errorMessage = "could not create sensor, reason: ";	
	if (!sensor) {
		throw new Error(errorMessage + "'sensor' is required");
	}		

	return Q(this._parseSensor(sensor))
		.tap(function(sensor) {
			return this._timeSeriesStore.createIndex({index: sensor.uri});
		}.bind(this))
		.tap(function(sensor) {
			return this._tripleStore.insertTriples(sensor.triples);
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
	return Q(this._parseSensor(options.sensor))
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
	return Q(this._parseSensor(options.sensor))
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
	return Q(this._parseSensor(options.sensor))
			.then(function(sensor) {
				return this._timeSeriesStore.getLatestValue(sensor.uri);
			}.bind(this))
			.catch(function(err) {
				return Q.reject(errorMessage + err);
			})
			.nodeify(callback);
}

StreamUp.prototype.query = function(query, callback) {
	var errorMessage = "could not find sensors, reason: ";	
	if (!query || !(utils.isArray(query) || utils.isString(query))) {
		throw new Error(errorMessage + "invalid argument '" + JSON.stringify(options) + "' must contain property 'query' of type 'array' or 'string'");
	}		
	return this._tripleStore.query(query)
			.catch(function(err) {
				return Q.reject(errorMessage + err);
			})
			.nodeify(callback);
}

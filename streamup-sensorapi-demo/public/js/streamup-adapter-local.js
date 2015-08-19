function StreamUpAdapterLocal()  {
	this.tripleStore = StreamUp.TripleStoreLevelGraph('metadata', { joinAlgorithm: 'basic' });
    this.timeSeriesStore  = StreamUp.TimeSeriesStoreLemDB('timeseries'),
    this.streamUp         = StreamUp.StreamUp(	this.tripleStore, 
	                                 	this.timeSeriesStore, 
										SmartTecoOntology.getSensorUri,
										SmartTecoOntology.getSensorTriples);
}

function getMatches(string, regex, index) {
	index || (index = 0);
	var matches = [];
	var match;
	while (match = regex.exec(string)) {
		matches.push(match[index]);
	}
	return matches;
}

function onlyUnique(value, index, self) { 
	return self.indexOf(value) === index;
}

function parseForVariables(string) {
	var regex = /\?([A-Z]|[a-z]|'_'|[0-9])+(\b|\.)/g;
	return getMatches(string, regex, 0).filter(onlyUnique);
}

function parseTriples(string) {
	var result = [];			
	var regex = /\s*(\S+)\s+(\S+)\s+(\S+)\s*\./g
	var match;
	while (match = regex.exec(string)) {
		result.push({
			subject: match[1],
			predicate: match[2],
			object: match[3]
		});
	}
	return result;
}

StreamUpAdapterLocal.prototype.doQuery = function(query, callback) {
	this.streamUp.query(
		{
			type: "SELECT",
			variables: parseForVariables(query),
			triples: parseTriples(query)
		},null, callback);	
}

StreamUpAdapterLocal.prototype.checkDeviceExists = function(deviceId, callback) {
	this.doQuery('?device http://www.w3.org/1999/02/22-rdf-syntax-ns#type http://www.teco.edu/smartteco/Device. \
				  ?device http://www.teco.edu/smartteco/hasID "' + deviceId + '"^^http://www.w3.org/2001/XMLSchema#string.', 
				  function(err, result) {				  	
						if (callback && typeof(callback) === "function") {
							callback(null, result.length > 0);
						}
				  });
}

StreamUpAdapterLocal.prototype.checkSensorExists = function(deviceId, sensorId, callback) {
	return this.doQuery('?device http://www.w3.org/1999/02/22-rdf-syntax-ns#type http://www.teco.edu/smartteco/Device. \
					?device http://www.teco.edu/smartteco/hasID "' + deviceId + '"^^http://www.w3.org/2001/XMLSchema#string. \
					?device http://www.teco.edu/smartteco/hasSensor ?sensor. \
					?sensor http://www.w3.org/1999/02/22-rdf-syntax-ns#type http://www.teco.edu/smartteco/Sensor. \
					?sensor http://www.teco.edu/smartteco/hasID "' + sensorId + '"^^http://www.w3.org/2001/XMLSchema#string.',
					function(err, result) {
						if (callback && typeof(callback) === "function") {
							callback(null, result.length > 0);
						}
				  });
}

StreamUpAdapterLocal.prototype.createDevice = function(deviceId, callback) {	
	var deviceTriples = SmartTecoOntology.getDeviceTriples(deviceId);	
	this.tripleStore.query.bind(this.tripleStore)(deviceTriples, function(err, result) {
		if (!err) {
			// device does not exist
			this.tripleStore.insertTriples.bind(this.tripleStore)(deviceTriples, 
					function(err, result) {
						if (callback && typeof(callback) === "function") {
							callback(null, result.length > 0);
						}
				  	});
		} else {
			if (callback && typeof(callback) === "function") {
				callback(err, null);
			}
		}
	}.bind(this))
}

StreamUpAdapterLocal.prototype.createSensor = function(deviceId, sensorId, callback) {	
	var deviceTriples = SmartTecoOntology.getDeviceTriples(deviceId);	
	this.tripleStore.query.bind(this.tripleStore)(deviceTriples, function(err, result) {
		if (!err) {
			// device exists
			this.streamUp.createSensor.bind(this.streamUp)({deviceId: deviceId, sensorId: sensorId},
				function(err, result) {
						if (callback && typeof(callback) === "function") {
							callback(null, result.length > 0);
						}
				  	});
		} else {
			if (callback && typeof(callback) === "function") {
				callback(err, null);
			}
		}
	}.bind(this))
}

StreamUpAdapterLocal.prototype.insertValue = function(deviceId, sensorId, value, callback) {
	this.streamUp.insertValues.bind(this.streamUp)(
												{
													sensor: 
													{
														deviceId: deviceId, 
														sensorId: sensorId
													},
													data: [{value: value}]
												}, callback);
}

StreamUpAdapterLocal.prototype.getValues = function(deviceId, sensorId, start, end, callback) {	
	this.streamUp.getValues.bind(this.streamUp)(
												{
													sensor: 
													{
														deviceId: deviceId, 
														sensorId: sensorId
													},
													start: start,
													end: end
												}, callback);
}
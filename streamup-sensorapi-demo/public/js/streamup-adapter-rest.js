function StreamUpAdapterRest(host, port)  {
	this.host = host;
	this.port = port;
}

function executeHTTP(method, url, body, headers) {
	var client = new XMLHttpRequest();	
	client.open(method, url, false);
	if (headers) {
		Object.keys(headers).forEach(function(key) {
			client.setRequestHeader(key, headers[key])
		});
	}
	if (body) {
		client.send(body);
	} else {
		client.send();
	}
	return client;
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


StreamUpAdapterRest.prototype.getQueryUrl = function() {
	return 'http://' + this.host + ':' + this.port + '/query';
}

StreamUpAdapterRest.prototype.doQuery = function(query) {
	var response = executeHTTP('post', this.getQueryUrl(), 
		JSON.stringify({
			type: "SELECT",
			variables: parseForVariables(query),
			triples: parseTriples(query)
		}), {"Content-Type": "application/json"});
	if (response.status != 200) {
		throw "query failed (status: " + response.status + ", response: '" +  response.responseText + "')";
	}
	return JSON.parse(response.responseText);
}

StreamUpAdapterRest.prototype.checkDeviceExists = function(deviceId) {
	return this.doQuery('?device http://www.w3.org/1999/02/22-rdf-syntax-ns#type http://www.teco.edu/smartteco/Device. \
					?device http://www.teco.edu/smartteco/hasID "' + deviceId + '"^^http://www.w3.org/2001/XMLSchema#string.')	
			.length > 0;
}

StreamUpAdapterRest.prototype.checkSensorExists = function(deviceId, sensorId) {
	return this.doQuery('?device http://www.w3.org/1999/02/22-rdf-syntax-ns#type http://www.teco.edu/smartteco/Device. \
					?device http://www.teco.edu/smartteco/hasID "' + deviceId + '"^^http://www.w3.org/2001/XMLSchema#string. \
					?device http://www.teco.edu/smartteco/hasSensor ?sensor. \
					?sensor http://www.w3.org/1999/02/22-rdf-syntax-ns#type http://www.teco.edu/smartteco/Sensor. \
					?sensor http://www.teco.edu/smartteco/hasID "' + sensorId + '"^^http://www.w3.org/2001/XMLSchema#string.')	
			.length > 0;
}

StreamUpAdapterRest.prototype.createDevice = function(deviceId) {	
	var body = { deviceId: deviceId };
	var url = 'http://' + this.host + ':' + this.port + '/devices/create';										
	var response = executeHTTP('post', url, JSON.stringify(body), {"Content-Type": "application/json"});		
	if (response.status != 200) {
		throw "create device failed (status: " + response.status + ", response: '" +  response.responseText + "')";
	}
}

StreamUpAdapterRest.prototype.createSensor = function(deviceId, sensorId) {	
	var body = { deviceId: deviceId, sensorId: sensorId };
	var url = 'http://' + this.host + ':' + this.port + '/sensors/create';										
	var response = executeHTTP('post', url, JSON.stringify(body), {"Content-Type": "application/json"});		
	if (response.status != 200) {
		throw "create sensor failed (status: " + response.status + ", response: '" +  response.responseText + "')";
	}
}

StreamUpAdapterRest.prototype.insertValue = function(deviceId, sensorId, value) {
	var url = 'http://' + this.host + ':' + this.port + '/devices/' + deviceId + '/sensors/' + sensorId + '/values';
	var response = executeHTTP('put', url, JSON.stringify({value: JSON.stringify(value)}), {"Content-Type": "application/json"});		
	if (response.status != 200) {
		throw "create sensor failed (status: " + response.status + ", response: '" +  response.responseText + "')";
	}	
}

StreamUpAdapterRest.prototype.getValues = function(deviceId, sensorId, start, end) {	
	var url = 'http://' + this.host + ':' + this.port + '/devices/' + deviceId + '/sensors/' + sensorId + '/values';			
	var suffix = '';
	if (start) {
		suffix += 'start=' + start;
	}
	if (end) {
		if (suffix.length > 0) {
			suffix += '&';
		}
		suffix += 'end=' + end;
	}
	if (suffix.length > 0) {
		url += '?' + suffix;
	}
	var response = executeHTTP('get', url);	
	return JSON.parse(response.responseText);
}
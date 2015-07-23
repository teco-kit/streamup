// import jsonld and N3


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
	//return {result: client.status, message: client.responseText};	
	return client;
}


function parseRdfAsTriples(triples, format, callback) {
  var errorMessage = "error formatting triples: ";
  var convertFunction;  
  switch(format) {          
    case 'application/n-triples':
      format = 'N-Triples';
    case 'text/turtle':
    case 'N-Triples':
    case 'application/trig':
      var parser = N3.Parser({format: format});
      var result = [];
      parser.parse(rdf, function(err, triple, prefixes) {
        if (err) {
          callback(err, null);
        } else {
          if (triple) {          	
            result.push(triple);
          } else {
            callback(null, result);
          }
        }
      });
      break;    
    case 'application/ld+json':
      JSONLDtoTriples(rdf, function(err, result) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, result);
        }
      })
      break;    
    case 'application/rdf+xml':
      throw "format '" + format + "' not supported yet!"
      break;
    case 'application/spo+json':
      callback(null, triples);
    default: {
      callback(null, triples);
      //throw 'can not parse rdf as now format is specified';
    }
  } 
}

function JSONLDtoTriples(jsonld, callback) {
  jsonld.toRDF(jsonld, {format: 'application/nquads'}, function(err, rdf) {
    if (err) {
      callback(err, null);
    } else {
      var parser = N3.Parser();
      var result = [];
      parser.parse(rdf, function(err, triple, prefixes) {
        if (err) {
          callback(err, null);
        } else {
          if (triple) {
            result.push(triple);
          } else {
            callback(null, result);
          }
        }
      });
    }   
  })
};

function triplesToJSONLD(triples, callback) {  
  formatTriples(triples, 'N-Triples', function(err, rdf) {                
    if (err) {
      callback(err, null);
    } else {          
      jsonld.fromRDF(rdf, {format: 'application/nquads'}, function(err, jsonld) {
        if (err) {
          callback(err, null);
        } else {    
          callback(null, jsonld);
        }
      });
    }
  }); 
};

function getDropdownDataDevice(host, port, callback) {	
	getDropdownData(host, port, 
		[{
			subject: '?text',
			predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
			object: 'http://www.teco.edu/smartteco/Device'
		},
		{
			subject: '?text',
			predicate: 'http://www.teco.edu/smartteco/hasID',
			object: '?id'
		}], callback);
}

function getDropdownDataSensorsForDevice(host, port, deviceId, callback) {	
		getDropdownData(host, port, 
		[{
			subject: '?device',
			predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
			object: 'http://www.teco.edu/smartteco/Device'
		},
		{
			subject: '?device',
			predicate: 'http://www.teco.edu/smartteco/hasID',
			//object: deviceId
			object:  '"' + deviceId + '"^^http://www.w3.org/2001/XMLSchema#string'
		},
		{
			subject: '?device',
			predicate: 'http://www.teco.edu/smartteco/hasSensor',
			object: '?text'
		},
		{
			subject: '?text',
			predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
			object: 'http://www.teco.edu/smartteco/Sensor'
		},
		{
			subject: '?text',
			predicate: 'http://www.teco.edu/smartteco/hasID',
			object: '?id'
		}], callback);
}

function getDropdownData(host, port, pattern, callback) {	
	// assume query has ?id and ?test as results
	// could be assured
	var response = executeHTTP('post', 'http://' + host + ':' + port + '/query', 
		JSON.stringify({
			type: "SELECT",
			variables: ['?id', '?text'],
			triples: pattern
		}), {"Content-Type": "application/json"});
	if (response.status != 200) {
		callback(response.responseText, null);
	}
	response = JSON.parse(response.responseText);	
	var result = response.map(function(data) {	
		var id = N3.Util.isLiteral(data['?id']) ? N3.Util.getLiteralValue(data['?id']) : data['?id'];
		var text = N3.Util.isLiteral(data['?text']) ? N3.Util.getLiteralValue(data['?text']) : data['?text'];			
		return {
					id: id,
					//text: 'id: ' + id + ', uri: ' + text
					text :text
				};
	});
	callback(null, result);
}

function _formatTriples(triples, format, callback) {	
	var writer = N3.Writer({ format: format });
	writer.addTriples(triples);
	writer.end(function (err, result) { 		
		if (err) {
			callback(err, null);
		} else {			
			callback(null, result);
		}
	});
}

function formatTriples(triples, format, callback) {
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
		case 'application/spo+json':
		default: {
			// reject?
		}
	}	
	if (convertFunction) {			
		convertFunction(function(err, result) {
			if (err) {
				callback(err, null);
			} else {
				callback(null, result);
			}
		});
	} else {
		callback(null, triples);
	}
};
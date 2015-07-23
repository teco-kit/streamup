var should                = require('chai').should(),
    StreamUp              = require('streamup').StreamUp,
    TripleStoreLevelGraph = require('streamup').TripleStoreLevelGraph,
    TimeSeriesStoreLemDB  = require('streamup').TimeSeriesStoreLemDB,
    StreamUpServer        = require('../src/StreamUpServer'),
    XMLHttpRequest        = require("xmlhttprequest").XMLHttpRequest;
// need to create index.js fpr streamup project which exposes StreamUp, TripleStoreLevelGraph, TimeSeriesStoreLemDB, etc

var tripleStore     = TripleStoreLevelGraph('metadata', { joinAlgorithm: 'basic' });
    timeSeriesStore = TimeSeriesStoreLemDB('timeseries'),
    streamUp        = StreamUp( tripleStore, 
                                timeSeriesStore, 
                                function(input) {
                                  return "http://example.com" + input.id;
                                },
                                function(input) {
                                  return { 
                                          subject: "http://example.com" + input.id,
                                          predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                          object: "http://example.com/Sensor"
                                        }
                                  }
                              );

var streamUpServer  = StreamUpServer(streamUp, {port: 8080});

streamUpServer.on('start', function() { 
  tripleStore.clear();
});

var handlers =
[
  {
    type      : 'post',
    url       : 'sensors/create',
    options     : StreamUpServer.UrlOptions.parseBody,    
    target      : streamUp.createSensor.bind(streamUp),
    parseParameter  : function(req) {
              return  { id: req.body.id };
               },
    handleResult  : function(err, result) {             
              if (err) {
                return { code: 500, body: err };
              } else {
                return { code: 200, body: result };
              };
              }
  },
];

var executeHTTP = function(method, url, body, headers) {
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


describe('#StreamUpServer', function() {
  it('create sensor', function() {
    streamUpServer.start(handlers, function() {
      executeHTTP('POST', "http://localhost:8080/sensors/create", "{id: '111'}").status.should.be.exactly(200);
      streamUpServer.stop(done);
    });
  });  
});
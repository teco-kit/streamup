var should                = require('chai').should(),
    StreamUp              = require('../src/StreamUp'),
    TripleStoreLevelGraph = require('../src/TripleStoreLevelGraph'),
    TimeSeriesStoreLemDB  = require('../src/TimeSeriesStoreLemDB');



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





describe('#StreamUp', function() {
  it('create sensor', function() {
    streamUp.createSensor({id: '123'}, function(err, sensor) {
      err.should.not.be.ok;
    })    
  });  
});

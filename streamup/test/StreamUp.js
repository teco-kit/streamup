var chai                  = require("chai"),
    chaiAsPromised        = require("chai-as-promised"),  
    should                = require('chai').should(),    
    StreamUp              = require('../src/StreamUp'),
    TripleStoreLevelGraph = require('../src/TripleStoreLevelGraph'),
    TimeSeriesStoreLemDB  = require('../src/TimeSeriesStoreLemDB');

chai.use(chaiAsPromised);


var tripleStore     = TripleStoreLevelGraph('metadata', { joinAlgorithm: 'basic' });
    timeSeriesStore = TimeSeriesStoreLemDB('timeseries'),
    streamUp        = StreamUp( tripleStore, 
                                timeSeriesStore, 
                                function(input) {
                                  return "http://example.com/" + input.id;
                                },
                                function(input) {
                                  return { 
                                          subject: "http://example.com/" + input.id,
                                          predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                          object: "http://example.com/Sensor"
                                        }
                                  }
                              );

var expectedResults = {
  sensor: {id : '1'},
  triples: [{"subject":"http://example.com/1","predicate":"http://www.w3.org/1999/02/22-rdf-syntax-ns#type","object":"http://example.com/Sensor"}],
  values: [ {value: 'test1', timestamp: 1000000}, {value: 'test2', timestamp: 2000000}]
}



describe('StreamUp', function() {

    before('clear databases before tests', function() {
      return timeSeriesStore.clear()
        .then(tripleStore.clear());
    });

    after('clear databases after tests', function() {
      return timeSeriesStore.clear()
        .then(tripleStore.clear())
    });

  describe('#createSensor', function() {
    // create sensor
    it('should create sensor and return triples as expected', function() {
      return timeSeriesStore.clear()
        .then(tripleStore.clear())
        .thenResolve(expectedResults.sensor)
        .then(streamUp.createSensor.bind(streamUp))
        .should.eventually.deep.equal(expectedResults.triples[0]);
    });
  });

  describe('#insertValues', function() {
    it('should insert values as expected', function() {
      return streamUp.insertValues({
                        sensor: expectedResults.sensor,
                        data: expectedResults.values
                    })
      .should.eventually.deep.equal(expectedResults.values);
    });
  });

  describe('#insertValues', function() {
    it('should get values as expected using no time bounds', function() {
      return streamUp.getValues({
                        sensor: expectedResults.sensor
                    })
      .should.eventually.deep.equal(expectedResults.values);
    });  

    it('should get values as expected using only lower time bound', function() {
      return streamUp.getValues({
                        sensor: expectedResults.sensor,
                        start:  expectedResults.values[0].timestamp
                    })
      .should.eventually.deep.equal(expectedResults.values);
    });    

    it('should get values as expected using only upper time bound', function() {
      return streamUp.getValues({
                        sensor: expectedResults.sensor,
                        end:    expectedResults.values.slice(-1)[0].timestamp
                    })
      .should.eventually.deep.equal(expectedResults.values);
    });  

    it('should get values as expected using upper & lower time bounds', function() {
      return streamUp.getValues({
                        sensor: expectedResults.sensor,
                        start:  expectedResults.values[0].timestamp,
                        end:    expectedResults.values.slice(-1)[0].timestamp
                    })
      .should.eventually.deep.equal(expectedResults.values);
    });  

    it('should failed because it does not return the value with the lowest timestamp', function() {
      return streamUp.getValues({
                        sensor: expectedResults.sensor,
                        start:  expectedResults.values[0].timestamp+1
                    })
      .should.eventually.deep.not.equal(expectedResults.values);
    });  

    it('should failed because it does not return the value with the highest timestamp', function() {
      return streamUp.getValues({
                        sensor: expectedResults.sensor,
                        end:    expectedResults.values.slice(-1)[0].timestamp-1
                    })
      .should.eventually.deep.not.equal(expectedResults.values);
    });  
  });

  describe('#query', function() {
    // query
    it('should return all triples in store', function() {
      var query = {
                    type:       'SELECT',
                    variables:  ['?s', '?p', '?o'],
                    triples:    [{subject: '?s', predicate: '?p', object: '?o'}]
                  }

      return streamUp.query(query, {})
              .should.eventually.deep.equal(expectedResults.triples.map(function(triple) {
                return { '?s' : triple.subject, '?p': triple.predicate, '?o' : triple.object};
              }));
    });    
  });
})

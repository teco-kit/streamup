var chai                  = require("chai"),
    chaiAsPromised        = require("chai-as-promised"),    
    chaiHttp              = require('chai-http'),
    should                = require('chai').should(),
    expect                = require('chai').expect,
    StreamUp              = require('streamup').StreamUp,
    TripleStoreLevelGraph = require('streamup').TripleStoreLevelGraph,
    TimeSeriesStoreLemDB  = require('streamup').TimeSeriesStoreLemDB,
    StreamUpServer        = require('../src/StreamUpServer'),
    Q                     = require('q');

chai.use(chaiAsPromised);
chai.use(chaiHttp);

if (!global.Promise) {
  chai.request.addPromises(Q.Promise);
}

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
var PORT = 8080;

var streamUpServer  = StreamUpServer(streamUp, {port: PORT});



streamUpServer.on('start', function() { 
  tripleStore.clear();
  timeSeriesStore.clear();
});

var handlers =
[
  {
    type            : 'post',
    url             : 'sensors/create',
    options         : StreamUpServer.UrlOptions.parseBody,    
    target          :   streamUp.createSensor.bind(streamUp),
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
  }
];


var expectedResults = {
  sensor: {id : '1'},
  triples: [{"subject":"http://example.com/1","predicate":"http://www.w3.org/1999/02/22-rdf-syntax-ns#type","object":"http://example.com/Sensor"}],
  values: [ {value: 'test1', timestamp: 1000000}, {value: 'test2', timestamp: 2000000}]
}


describe('StreamUpServer', function() {

    before('start StreamUp server', function() {
      return streamUpServer.start(handlers);
    });

    after('shutdown StreamUp server', function() {
      return streamUpServer.stop();
    });
    
    describe('#createSensor', function() {
        it('should create sensor and return triples as expected', function() {
          return chai.request('http://localhost:8080')
                    .post('/sensors/create')
                    .set("Content-Type", "application/json")
                    .send({id: '1'})
                    .then(function(res) {
                        expect(res).to.have.status(200);
                        expect(res.body).to.deep.equal(expectedResults.triples[0]);
                    })        
        })        
    });
});  
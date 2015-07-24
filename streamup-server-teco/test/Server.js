var chai                  = require("chai"),
    chaiAsPromised        = require("chai-as-promised"),    
    chaiHttp              = require('chai-http'),
    should                = require('chai').should(),
    expect                = require('chai').expect,
    StreamUpServerTeco    = require('../src/Server'),
    request               = require('request'),
    Q                     = require('q');

chai.use(chaiAsPromised);
chai.use(chaiHttp);

if (!global.Promise) {
  chai.request.addPromises(Q.Promise);
}

// CHANGE THE TEST TO FIT THE CLASS

var PORT = 8090;


var expectedResults = {
  device: {deviceId: '1'},
  deviceTriples: [
              { "subject":"http://www.teco.edu/smartteco/devices/1",
                "predicate":"http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                "object":"http://www.teco.edu/smartteco/Device"
              },
              { "subject":"http://www.teco.edu/smartteco/devices/1",
                "predicate":"http://www.teco.edu/smartteco/hasID",
                "object":"\"1\"^^http://www.w3.org/2001/XMLSchema#string"}
           ],
  values: [ {value: 'test1', timestamp: 1000000}, {value: 'test2', timestamp: 2000000}]
}


describe('StreamUpServerTeco', function() {

    before('create StreamUpServerTeco', function() {
      server = StreamUpServerTeco({port: PORT});
      return server.start();
    })

    after('shutdown StreamUpServerTeco', function() {
      return server.stop();
    })

    describe('#createSensor', function() {
        it('should create sensor and return triples as expected', function() {
          return chai.request('http://localhost:' + PORT)
                    .post('/devices/create')
                    .set("Content-Type", "application/json")
                    .send(expectedResults.device)
                    .then(function(res) {
                        expect(res).to.have.status(200);                        
                        expect(res.body).to.deep.equal(expectedResults.deviceTriples);
                    })        
        })        
    });
});  
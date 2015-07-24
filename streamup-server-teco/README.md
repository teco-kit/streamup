StreamUp-Server
=========

A concrete implementation of the streamup-server with a teco-specific REST interface and ontology. 

## Installation

  npm install streamup-server --save

## Usage

var StreamUpServerTeco	= require('streamup-server-teco');

var server = StreamUpServerTeco.Server({port: 8090});
server.start();
...
server.stop();

## Tests

  npm test

## Release History

* 0.1.0 Initial release

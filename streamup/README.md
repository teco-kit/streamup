StreamUp
=========

A library for managing sensor metadata and reading combining the power of semantic metadata description and time series stores.

## Installation

  npm install streamup --save

## Usage

var StreamUp 				= require('StreamUp'),
	TripleStoreLevelGraph 	= require('TripleStoreLevelGraph'),
	TimeSeriesStoreLemDB	= require('TimeSeriesStoreLemDB');

var tripleStore 	= TripleStoreLevelGraph('metadata', { joinAlgorithm: 'basic' });
var timeSeriesStore = TimeSeriesStoreLemDB('timeseries');
var streamUp 		= StreamUp(	tripleStore, 
								timeSeriesStore, 
								function(input) {
									return "http://example.com" + input.id;
								},
								function(input) {
									return { 
										subject: "http://example.com" + input.id,
										predicate "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
										object: "http://example.com/Sensor"
								}});
streamUp.createSensor({id: '123'}, function(err, sensor) {
	if (err) {
		// handle error
	} else {
		// sensor created successfully
	}
})

## Tests

  npm test

## Release History

* 0.1.0 Initial release

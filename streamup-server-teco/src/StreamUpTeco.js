var StreamUp 				= require('streamup'),
	TripleStoreLevelGraph 	= StreamUp.TripleStoreLevelGraph,
	TimeSeriesStoreLemDB	= StreamUp.TimeSeriesStoreLemDB,
	Ontology				= require('./SmartTecoOntology'),
	utils 					= StreamUp.Utils;

// bind concrete implementations to StreamUp
// expose need libraries to global window

var tripleStore 	= TripleStoreLevelGraph('metadata');
var timeSeriesStore = TimeSeriesStoreLemDB('timeseries');
var streamUp 		= StreamUp(	tripleStore, 
								timeSeriesStore, 
								Ontology.getSensorUri,
								Ontology.getSensorTriples
);

module.exports.StreamUp = streamUp;
module.exports.TimeSeriesStore = timeSeriesStore;
module.exports.TripleStore = tripleStore;
module.exports.Ontology = Ontology;
module.exports.Utils = utils;
var N3 		= require('n3');
var N3Util	= N3.Util;
var utils	= require('./Utils.js');
// ------------- attributes -------------

// smartteco ontology
var BASE_URI 			= "http://www.teco.edu/smartteco/",
	// classes
	DEVICE_CLASS		= BASE_URI + "Device",
	SENSOR_CLASS		= BASE_URI + "Sensor",
	// properties
	HAS_ID				= BASE_URI + "hasID",
	HAS_SENSOR			= BASE_URI + "hasSensor",	
	// patterns	
	DEVICE_ID_TAG 		= "[DEVICE_ID]",
	SENSOR_ID_TAG 		= "[SENSOR_ID]",
	DEVICE_URI_PATTERN 	= BASE_URI + "devices/[DEVICE_ID]",
	SENSOR_URI_PATTERN 	= DEVICE_URI_PATTERN + "/sensors/[SENSOR_ID]";

// other ontologies
var IS_A = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
var XSD_BASE = "http://www.w3.org/2001/XMLSchema#",
	XSD_STRING 		= XSD_BASE + "string",
	XSD_INT 		= XSD_BASE + "integer",
	XSD_BOOLEAN		= XSD_BASE + "boolean",
	XSD_DECIMAL 	= XSD_BASE + "decimal",
	XSD_DOUBLE 		= XSD_BASE + "double",
	XSD_FLOAT 		= XSD_BASE + "float",
	XSD_DATE_TIME 	= XSD_BASE + "dateTime", 
	XSD_TIME 		= XSD_BASE + "time",
	XSD_DATE 		= XSD_BASE + "date";
	
var prefixes = {'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
				'owl': 'http://www.w3.org/2002/07/owl#',
				'xsd': 'http://www.w3.org/2001/XMLSchema#',				
				'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
				'ssn': 'http://purl.oclc.org/NET/ssnx/ssn#',
				'teco': BASE_URI};

// ------------- functions -------------
				
var getDeviceUri = function(deviceId) {
	return DEVICE_URI_PATTERN.replace(DEVICE_ID_TAG, deviceId);
};

var getSensorUri = function(deviceId, sensorId) {	
	if (utils.isObject(deviceId)) {
		sensorId = deviceId.sensorId;
		deviceId = deviceId.deviceId;
	}	
	return SENSOR_URI_PATTERN.replace(DEVICE_ID_TAG, deviceId).replace(SENSOR_ID_TAG, sensorId);
};				

var createLiteral = function(value, datatype) {
	return N3Util.createLiteral(value, datatype);
}

var createStringLiteral = function(value) {
	return N3Util.createLiteral(value, XSD_STRING);
}

var createIntegerLiteral = function(value) {
	return N3Util.createLiteral(value, XSD_INT);
}

function getDevice(deviceId) {
	if (utils.isObject(deviceId)) {
		deviceId = deviceId.deviceId;
	}
	return { uri: getDeviceUri(deviceId), id: deviceId}
}

function getSensor(deviceId, sensorId) {
	if (utils.isObject(deviceId)) {
		sensorId = deviceId.sensorId;
		deviceId = deviceId.deviceId;
	}
	return { uri: getSensorUri(deviceId, sensorId), id: sensorId}
}

function getTriples(sensor) {
	var device = getDevice(sensor.deviceId);
	sensor = getSensor(sensor.deviceId, sensor.sensorId);
	return [
	{
		subject: device.uri,
		predicate: IS_A,
		object: DEVICE_CLASS
	},{
		subject: device.uri,
		predicate: HAS_ID,
		object: createStringLiteral(device.id)
	},{
		subject: device.uri,
		predicate: HAS_SENSOR,
		object: sensor.uri
	},{
		subject: sensor.uri,
		predicate: IS_A,
		object: SENSOR_CLASS
	},{
		subject: sensor.uri,
		predicate: HAS_ID,
		object: createStringLiteral(sensor.id)
	}];
}
				
// ------------- exports -------------
// attributes
exports.BASE_URI 				= BASE_URI;
exports.DEVICE_CLASS 			= DEVICE_CLASS;
exports.SENSOR_CLASS 			= SENSOR_CLASS;
exports.HAS_ID 					= HAS_ID;
exports.HAS_SENSOR 				= HAS_SENSOR;
exports.prefixes 				= prefixes;
exports.IS_A 					= IS_A;

// functions
exports.getDeviceUri 				= getDeviceUri;
exports.getSensorUri			= getSensorUri;
exports.createLiteral			= createLiteral;
exports.createStringLiteral		= createStringLiteral;
exports.createIntegerLiteral	= createIntegerLiteral;
exports.getTriples				= getTriples;
exports.getDevice				= getDevice;
exports.getSensor				= getSensor;
// enum
exports.XSD_DATATYPES		= {	STRING 		: XSD_STRING,
								INTEGER		: XSD_INT,
								DATE_TIME	: XSD_DATE_TIME};
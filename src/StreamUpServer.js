var EventEmitter = require('events').EventEmitter;
var util = require('util');
var utils = require('./Utils.js');

var restify 			= require('restify');
var Q 					= require('q');
	

var IStreamUp = new utils.Interface('IStreamUp', 
	[
		'createSensor', 
		'insertValues',
		'getValues',
		'getLatestValue',
		'query'
	]);


module.exports = function(streamUp, options){
	if(!streamUp){
		throw new Error('streamUp is required!');
	}
	if(!options.port){
		throw new Error('options.port is required!');
	}	
	utils.Interface.ensureImplements(streamUp, IStreamUp);
	return new StreamUpServer(streamUp, options);
}

module.exports.UrlOptions = {
		parseQuery 	: restify.queryParser(),
		parseBody	: restify.bodyParser({ mapParams: false })
	};

function StreamUpServer(streamUp, options){
	var self = this	
	this._streamUp = streamUp;
	this._options = options;
	this._server = restify.createServer();
	this._server.use(restify.queryParser());
	this._server.use(restify.bodyParser({mapParams: false}));
	//this._server.use(restify.CORS());
	//this._server.use(restify.fullResponse());
	this._server.use(
	  function crossOrigin(req,res,next){
	    res.header("Access-Control-Allow-Origin", "*");
	    res.header("Access-Control-Allow-Headers", "X-Requested-With");
	    return next();
	  }
	);
}

util.inherits(StreamUpServer, EventEmitter);

function sendResponse(options, callback) {
	console.log('sending response with options: ' + JSON.stringify(options.data));
	if (options.data.asJson === true) {
		options.res.send(options.data.code, options.data.body);
	} else {
		options.res.send(options.data.code, options.data.body);
	}
}

function addHandler(handler, callback) {
	var options = null;
	if (handler.options) {
		options = handler.options;
	}
	this._server[handler.type].call(this._server, handler.url, function(req, res, next) {
		this.emit('request', req, res, next);
		var params = handler.parseParameter(req)
		handler.target(params, function(err, result) {
			sendResponse({ res: res, data: handler.handleResult(err, result)});
		})
	},
	options);
}

StreamUpServer.prototype.start = function(handlers, callback) {	
	handlers.map(function(handler) {
		addHandler.call(this, handler);
	}.bind(this));
	this._server.listen(this._options.port, function(err, result) {
		if (!err) {
			this.emit('start');
			console.log('server up and listening on port ' + this._options.port);
		}		
		if (callback) {
			callback(err, result);	
		} 
	}.bind(this));
}

StreamUpServer.prototype.stop = function(options, callback) {
	this._server.close(callback);
}

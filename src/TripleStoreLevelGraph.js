var LevelGraph 			= require("levelgraph"),
	LevelGraphJsonLD 	= require('levelgraph-jsonld'),
	LevelGraphN3 		= require('levelgraph-n3'),
	Q 					= require('q');
	JsonLD 				= require('jsonld'),
	utils				= require('./Utils.js'),
	fs 					= require("fs");	
	
module.exports = function(db, options){
	if(!db){
		throw new Error('db required')
	}
	options = options || {}
	return new TripleStore(db, options);
}

function TripleStore(db, options){
	
	this._db = db;
	this._options = options;

	this._tripleStore 		= LevelGraph(db, options);
	this._tripleStoreJsonLD	= LevelGraphJsonLD(this._tripleStore, options);
	this._tripleStoreN3		= LevelGraphN3(this._tripleStore);

	this._put 				= Q.nbind(this._tripleStore.put, this._tripleStore);
	this._get 				= Q.nbind(this._tripleStore.get, this._tripleStore);
	this._search 			= Q.nbind(this._tripleStore.search, this._tripleStore);
	this._del 		 		= Q.nbind(this._tripleStore.del, this._tripleStore);
		
	this._expand 			= Q.nbind(JsonLD.expand, JsonLD);
	this._putJsonLD	 		= Q.nbind(this._tripleStoreJsonLD.jsonld.put, this._tripleStoreJsonLD.jsonld);
}


TripleStore.prototype.insertTriple = function(triple, callback) {	
	return this._put([triple])
			.thenResolve(triple)
			.catch(function(err) {
				return Q.thenReject(err);
			})
			.nodeify(callback);	
}

TripleStore.prototype.insertTriples = function(triples, callback) {		
	return this._put(triples)
			.thenResolve(triples)
			.catch(function(err) {
				return Q.thenReject(err);
			})
			.nodeify(callback);	
}

TripleStore.prototype.deleteTriple = function(triple, callback) {
	return this._del(triple, null)	
			.thenResolve(triple)
			.nodeify(callback);
}

TripleStore.prototype.deleteTriples = function(triples, callback) {
	var jobs = 	triples.map(function(triple) {
					return this._del(triple, null);
				}.bind(this));
	return Q.allSettled(jobs)
			.thenResolve(triples)
			.nodeify(callback);
}

TripleStore.prototype.getAllTriples = function(options, callback) {
	return this._get({}).nodeify(callback);
}


TripleStore.prototype.clear = function (options, callback) {	
	return this.getAllTriples()	
			.then(this.deleteTriples.bind(this))
			.then(function (results) {
				var success = 0;
			    results.forEach(function (result) {
			        if (result.state === "fulfilled") {	        	
			            success++;
			        } 
		    	});
		    	return success;
			}).nodeify(callback);	
}

TripleStore.prototype.insertFromFile = function(options, callback) {	
	var deferred = Q.defer();
	if (!options.file || !utils.isString(options.file)) {
		deferred.reject(new Error("Invalid argument '" + JSON.stringify(options) + "' must contain property 'file' of type 'string'"));
	}	
	if (options.format !== 'N3') {
		deferred.reject(new Error("Invalid argument '" + JSON.stringify(options) + "' unsupported format '" + options.format + "'"));
	}	
	var stream = fs.createReadStream(options.file).pipe(this._tripleStoreN3.n3.putStream());
	stream.on("end", function(err) {
		if (err) {
			deferred.reject(err);
		}
		else {			
			deferred.resolve(options);
		}	
	});		
	return deferred.promise.nodeify(callback);
}

TripleStore.prototype.insert = function(options, callback) {	
	if (!options.data || !utils.isString(options.data)) {
		throw new Error("Invalid argument '" + JSON.stringify(options) + "' must contain property 'data' of type 'string'");
	}	
	if (options.format !== 'JSONLD') {
		throw new Error("Invalid argument '" + JSON.stringify(options) + "' unsupported format '" + options.format + "'");
	}	
	this._expand(options.data)
			.then(this._putJsonLD)
			.nodeify(callback);
}


TripleStore.prototype.query = function(query, callback) {
	var query = parseQuery.bind(this)(query);	
	return this._search(query).nodeify(callback);
}
	
function parseQuery(query)	{
	return query.map(function(triple) {		
		Object.keys(triple).map(function(key) {
			if (utils.isString(triple[key])) {
				triple[key] = (triple[key].substring(0,1) == '?' ? this._tripleStore.v(triple[key]) : triple[key]) ;
			}
		}.bind(this));
		return triple;
	}.bind(this));
}


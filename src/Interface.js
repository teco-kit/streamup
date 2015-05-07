
var Interface = function (objectName, methods) {
	if (arguments.length != 2) {
		throw new Error ("Interface constructor called with " + arguments.length + "arguments, but expected exactly 2.");
	}

	this.name = objectName;
	this.methods = [];
 
	for (var i = 0, len = methods.length; i < len; i++) {
		if (typeof methods[i] !== 'string') {
			throw new Error ("Interface constructor expects method names to be " + "passed in as a string.");
		}

		this.methods.push(methods[i]);
	}
};
 
Interface.ensureImplements = function (object) {
	if (arguments.length < 2) {
		throw new Error ("Interface.ensureImplements was called with " + arguments.length + "arguments, but expected at least 2.");
	}
 
	for (var i = 1, len = arguments.length; i < len; i++) {
		var interface = arguments[i];
		if (interface.constructor !== Interface) {
			throw new Error ("Interface.ensureImplements expects the second argument to be an instance of the 'Interface' constructor.");
		}

		for (var j = 0, methodsLen = interface.methods.length; j < methodsLen; j++) {

			var method = interface.methods[j];
 
			if (!object[method] || typeof object[method] !== 'function') {
				throw new Error ("This Class does not implement the '" + interface.name + "' interface correctly. The method '" + method + "' was not found.");
			}
		}
	}
};

exports.Interface = Interface;


function SensorEventEmitter() {	
	this.eventMap = [	{id: 'deviceCreate', listeners: []},
						{id: 'sensorCreate', listeners: []},
						{id: 'valueInsert', listeners: []}]
}

SensorEventEmitter.prototype = {

    subscribe: function(eventId, listener) {
    	var listeners = this.eventMap.filter(function(item) {
    		return item.id == eventId;
    	})[0].listeners;
    	if(listeners) {
    		listeners.push(listener);	
    	} 
    },
 
    unsubscribe: function(eventId, listener) {
    	var listeners = this.eventMap.filter(function(item) {
    		return item.id == eventId;
    	})[0].listeners;
    	if (listeners) {
    		listeners = listeners.filter(
				function(item) {
					if (item !== listener) {
						return item;
					}
				}
            );
    	}
    },
 
    fire: function(eventId, event, thisObj) {
        var scope = thisObj || window;
        var listeners = this.eventMap.filter(function(item) {
    		return item.id == eventId;
    	})[0].listeners;
    	if (listeners) {
			listeners.forEach(function(listener) {
				listener.call(scope, event);
			});
    	}        
    }
}
 

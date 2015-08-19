
function SensorEventConsumer(handlerMap) {	    
    this.handlerMap = handlerMap;
	this.eventMap = [	{id: 'deviceCreate', listeners: []},
						{id: 'sensorCreate', listeners: []},
						{id: 'valueInsert', listeners: []}]
}

SensorEventConsumer.prototype = {

    connectToEventEmitter: function(emitter) {
        if (!emitter.prototype instanceof SensorEventEmitter) {
            throw "emitter must be subclass of 'SensorEventEmitter'";
        }
        handlerMap.forEach(function(handler) {
            emitter.subscribe(handler.id, handler.handler)
        })
    },

    dicconnectFromEventEmitter: function(emitter) {
        handlerMap.forEach(function(handler) {
            emitter.unsubscribe(handler.id, handler.handler)
        })
    }
}
 

SensorAPISensorEventEmitterWrapper.prototype = new SensorEventEmitter();

function SensorAPISensorEventEmitterWrapper(sensorAPI) {	
    this.sensorAPI = sensorAPI;
    sensorAPI.onDeviceAdded(function(device) {
        fire('deviceCreate', device);
        device.sensors.forEach(function(sensor) {
            fire('sensorCreate', { deviceId: device.ID, sensor: sensor});
            sensor.subscribe(function(value) {
                fire('valueInsert', {deviceId: device.ID, sensorId: sensor.Id, value: value});
            });
        });
    });
}
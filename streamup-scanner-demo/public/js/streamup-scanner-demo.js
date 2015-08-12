var devicesFound = [];
var app = new scanner([{driver:"js/driver/browserDeviceMotion.js"}]);

app.onDeviceAdded(function(device) {
//Add the found devices to our global variable 'devicesFound'
	devicesFound.push(device);
	for(device in devicesFound) {
		var text = device.name + " | ";
		for (var property in device.services) {
		        text += property + ",";
		}
	  $('#device_list').append(text + "</br>");
	}	        
});
/*
function getNewSensors(device) {
	devices.find(function(x) { x.name === device.name})
}

app.onDeviceUpdated(function(device) {

	devicesFound.push(device);
	var text = device.name + " | ";
	for (var property in device.services) {
	        text += property + ",";
	}
	alert(text);
	device.services.onAccelerometer(function(data) {
	alert('data: ' + JSON.stringify(data));
	});
})
*/
//Start scanning
app.startScan();
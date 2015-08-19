README of Browser Device Motion Driver for Scanners.js-API
===========================================

This README lists and explains its public APIs.
In Scanners.js when the onDeviceAdded is invoked and this driver is included. A device will passed to the Scanners.js-API.
The services which this driver provides are accessible within the Scanners.js-API over 'device.sensors'.

The provided services are:
Each sensor function accepts two paramters
- sensors(subscribe, callback)
- subscribe can be either "on" or "off"

accelerometer(subscribe, [callback])
-----------------------
Allows you to get the acceleration value without gravity.
If a callback is passed, an object will be passed to and be accessed like this:
```javascript
  accelerometer("on",function(accData) {
    console.log("Value x: " + accData.x + " value y: " + accData.y + " value z: " + accData.z);
  });
```

accelerometerIncludingGravity(subscribe, [callback])
-----------------------
Allows you to get the acceleration value including gravity.
If a callback is passed, an object will be passed to and be accessed like this:
```javascript
accelerometerIncludingGravity("on", function(accData) {
  console.log("Value x: " + accData.x + " value y: " + accData.y + " value z: " + accData.z);
});
```

rotationRate(subscribe, [callback])
-----------------------
When the offer is generated the callback will be invoked and get passed one
parameter which is the offer.
For example:
```javascript
rotationRate("on", function(accData) {
  console.log("Value alpha: " + accData.alpha + " value beta: " + accData.beta + " value gamma: " + accData.gamma);
});
```


Detail explanation:
------------------------------
Follow this link [Rotation Rate](http://www.html5rocks.com/en/tutorials/device/orientation/?redirect_from_locale=de).


Known issues
--------------
The sample rate cannot be controlled.

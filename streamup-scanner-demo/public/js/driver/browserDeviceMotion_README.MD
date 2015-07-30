README of Browser Device Motion Driver for Scanners.js-API
===========================================

This README lists and explains its public APIs.
In Scanners.js when the startScan() is invoked and this driver is included. A device will passed to the Scanners.js-API.
The services which this driver provides are accessible within the Scanners.js-API over 'device.services'.

The provided services are:

onAccelerometer([callback])
-----------------------
Allows you to get the acceleration value without gravity.
If a callback is passed, an object will be passed to and be accessed like this:
```javascript
  onAccelerometer(function(accData) {
    console.log("Value x: " + accData.x + " value y: " + accData.y + " value z: " + accData.z);
  });
```

offAccelerometer([callback])
-----------------------
A callback can be passed to get notified when the acceleormeter is turned off.
For example:
```javascript
  offAccelerometer(function() {
    console.log("Acceleormeter off");
  });
```

onAccelerometerIncludingGravity([callback])
-----------------------
Allows you to get the acceleration value including gravity.
If a callback is passed, an object will be passed to and be accessed like this:
```javascript
onAccelerometerIncludingGravity(function(accData) {
  console.log("Value x: " + accData.x + " value y: " + accData.y + " value z: " + accData.z);
});
```

offAccelerometerIncludingGravity([callback])
-----------------------
A callback can be passed to get notified when the acceleormeter is turned off.
For example:
```javascript
  offAccelerometerIncludingGravity(function() {
    console.log("Acceleormeter off");
  });
```

onRotationRate([callback])
-----------------------
When the offer is generated the callback will be invoked and get passed one
parameter which is the offer.
For example:
```javascript
onRotationRate(function(accData) {
  console.log("Value alpha: " + accData.alpha + " value beta: " + accData.beta + " value gamma: " + accData.gamma);
});
```

offRotationRate([callback])
-----------------------
When the offer is generated the callback will be invoked and get passed one
parameter which is the offer.
For example:
```javascript
  offRotationRate(function() {
    console.log("rotation rate off");
  });
```

Detail explanation:
------------------------------
Follow this link [Rotation Rate](http://www.html5rocks.com/en/tutorials/device/orientation/?redirect_from_locale=de).


Known issues
--------------
The sample rate cannot be controlled.

/*
* This driver should work as the easyble driver
* it must provide
* - services with eg. getAccelerometer etc....
* - startScan
* - stopScan
* - the startScan should
* - also important address (uuid) and name
*/

// Object that holds local device data and functions.
cordovaDevice = (function()
{
    /** Main object in the EasyBLE API. */
    var cordovaDevice = {};

    /** Internal properties and functions. */
    var internal = {};

    cordovaDevice.startScan = function(win, fail) {
      var device = {};

      // Name the device
      if(window.device && window.device.model) {
        device.name = window.device.model;
    }

      // Rssi should be 0
      device.rssi = 0;

      //Wir brauchen eine adresse zur identifizierung
      if(window.device && window.device.uuid) {
        device.address = window.device.uuid;
      }
      // Build Services
      device.services = {};

      var internal = {};
      //Standard internal callback
      internal.stdCallback = function(data) {console.log("Standard-callback executed: " + data);}

      //Standard internal fail callback
      internal.failCallback = function(e) { console.log("Fail callback executed: "  + e);}

      // Internal watch id for cordva specific sensors
      internal.accWatchID = null;

      internal.headWatchID = null;


      // According to cordova Docs there are several sensors
      // like compassHeading
      if(navigator.compass && navigator.compass.getCurrentHeading) {
        device.services.currentCompassHeadingOn = function(callback, fail) {
          callback = callback ? callback : internal.stdCallback;
          fail = fail ? callback : internal.failcallback;
          navigator.compass.getCurrentHeading(callback);
        }
      }
      if(navigator.compass && navigator.compass.watchHeading) {
        device.services.compassHeadingOn = function(callback, fail){
          callback = callback ? callback : internal.stdCallback;
          fail = fail ? callback : internal.failcallback;
          if(!internal.headWatchID) {
            internal.headWatchID = navigator.compass.watchHeading(callback);
          }
        }
      }

      if(navigator.compass && navigator.compass.clearWatch) {
        device.services.compassHeadingOff = function(callback, fail){
          callback = callback ? callback : internal.stdCallback;
          fail = fail ? callback : internal.failcallback;
          console.log(internal.headWatchID);
          navigator.compass.clearWatch(internal.headWatchID);
          internal.headWatchID = null;
        }
      }

      if(navigator.accelerometer && navigator.accelerometer.getCurrentAcceleration) {
        device.services.currentAccelerationOn = function(callback, fail){
          callback = callback ? callback : internal.stdCallback;
          fail = fail ? callback : internal.failcallback;
          navigator.accelerometer.getCurrentAcceleration(callback);
        }
      }

      if(navigator.accelerometer && navigator.accelerometer.watchAcceleration) {
        device.services.accelerometerOn = function(callback, fail){
          callback = callback ? callback : internal.stdCallback;
          fail = fail ? callback : internal.failcallback;
          if(!internal.accWatchID) {
            internal.accWatchID = navigator.accelerometer.watchAcceleration(callback, fail, {frequency:1000});
          }
          console.log(internal.accWatchID);
        }
      }

      if(navigator.accelerometer && navigator.accelerometer.clearWatch) {
        device.services.accelerometerOff = function(callback, fail){
          callback = callback ? callback : internal.stdCallback;
          fail = fail ? callback : internal.failcallback;
          console.log(internal.accWatchID);
          navigator.accelerometer.clearWatch(internal.accWatchID);
          internal.accWatchID = null;
        }
      }
      win(device);
    }

    cordovaDevice.stopScan = function() {
      console.log("scanning stopped");
    }

    return cordovaDevice;
})();

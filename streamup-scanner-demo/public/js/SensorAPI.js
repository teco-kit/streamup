/*  This the abstraction layer above of the hardware layer
    This contains the ability to execute each forwarded scanner like btle for bluetooth low energy, or over a server
*/

/*TODO:
 */


// The main scanner object
var SensorAPI = (function(driver,options){
    //To be returned scanner object
    var SensorAPI = {};

    //Make scanner variable a DOM variable
    SensorAPI = document.createElement("object");

    //Holds internal functions
    var internal = {};

    // Registered scanner
    internal.scanners = [];

    // Setting sensor filter, when looking for specific sensors
    internal.filter = [];

    // Storing the driver objects
    //SensorAPI.drivers = [];

    // Stores drivers internally
    internal.drivers = [];

    //Storage for the devices
    internal.devices = [];

    //Storage for all ever detected devices
    internal.detectedDevices = [];

    //Internal timeout watcher for each device
    internal.timeouts = [];

    //Setze globalen Filter
    if(options && options.filterBySensorTypes) {
    	internal.filter = options.filterBySensorTypes ? options.filterBySensorTypes : "";
    } else {
    	internal.filter = false;
    }

    // events
    SensorAPI.events = {
        deviceAdded: "deviceAdded",
        deviceRemoved: "deviceRemoved"
      };

    //Setzte TTL für sensoren
    if(options && options.setTTL) {
    	internal.TTL = options.setTTL ? options.setTTL : 0;
    } else {
    	internal.TTL = 0;
    }

    /* Register function for scanner.
     Params
     scanners array(), expect objects
     fail     callback in case of fail
     */

    internal.register = function(drivers) {
        for(var scan = 0;scan< drivers.length; scan++) {
            //Check before pushing if the scanner object has a startScan function
            if(drivers[scan]) {
                internal.scanners.push({"driver": drivers[scan].driver, "args":drivers[scan].args});
            }
        }
    }

	/*
	General fail function
	*/

	internal.failFunction = function(e) {
		console.log("Failure: " +JSON.stringify(e));
	}


    /*
     Expecting sensors as an object. Each element in the object must represent a sensor. So that one can sort out the sensors according to the
     given flter. internal.filter
     */
     internal.storeDevice = function(device, driver) {
     	var stringSensor = "";
      //chekc if the device has a Name
      if(!device.name) {
        device.name = "Unknown device";
      }

     	//for(var dev in device) {
     		//Check if the sensors is already in internal.devices
     		if(device.ID != undefined) {

          if(internal.filterBySensorType(device.sensors)) {
  	          // Überprüfe ob der Sensor bereits bekannt ist und im internal.devices vorhanden ist.
              if(!internal.devices[device.ID]) {
                  //Speicher welcher treiber verwendet wird
                  internal.devices[device.ID] = device;
                  //Speicher in jemals gefundenen array
                  internal.detectedDevices[device.ID] = device;
              }

  				}
      } else {
        console.log("Device is not supported and will be therefore not stored/tracked. Result of getDevices wont contain this device." + device.name);
      }
        var event = new CustomEvent(SensorAPI.events.deviceAdded, {detail:{driver:driver, device:device}},false,false);
        SensorAPI.dispatchEvent(event);
     	//}

     }

     // Callback Function when the interface of the driver is offering an onDeviceRemoved
     internal.removeDevice = function(device) {
       var event = new CustomEvent(SensorAPI.events.deviceRemoved, {detail:device},false,false);
       SensorAPI.dispatchEvent(event);
     }



     SensorAPI.onDeviceAdded = function(callback) {
       var stdCallback = function(device) {
         console.log("Device : " + device.name + " (address: " + device.address  +") added.");
       }

       // Schaue ob ein callback übergeben wurde
       // sonst nutze den oben deklarierten Standardcallback
       callback = callback ? callback : stdCallback;
       SensorAPI.addEventListener(SensorAPI.events.deviceAdded, function(obj) {
         callback(obj.detail);
       });
     }


     SensorAPI.onDeviceRemoved= function(callback) {
       var stdCallback = function(device) {
         console.log("Device : " + device.name + " (address: " + device.address  +") removed.");
       }

       // Schaue ob ein callback übergeben wurde
       // sonst nutze den oben deklarierten Standardcallback
       callback = callback ? callback : stdCallback;

       SensorAPI.addEventListener(SensorAPI.events.deviceRemoved, function(obj) {
         callback(obj.detail);
       });
     }


     // Remove device
     internal.removeDevice = function(device) {
       var event = new CustomEvent(SensorAPI.events.deviceRemoved, {detail:device},false,false);
       SensorAPI.dispatchEvent(event);
       //$(scanner).trigger(scanner.events.deviceRemoved,device);
     }


    //Internal filter function
    //accepts only the string which is to be searched in
    internal.filterBySensorType = function(services) {
        var found = false;
        //console.log(deviceToBeSearched);
        if(internal.filter && services != null) {
            for (filter in internal.filter) {

            }
        }
        if(!internal.filter) {
        	found = true;
        }
        return found;
    }


    SensorAPI.getAllDevices = function() {
        //Hole alle Devices aus dem Storage raus
        //var devices = simpleStorage.index();

        var deviceList = [];
        for(var devAddress in internal.devices) {
          // All devices with the rssi -999 will never be removed also if a TTL value is set
          if(internal.devices[devAddress].rssi && internal.devices[devAddress].rssi != -999) {
            if(internal.TTL > 0) {
                // checke ob TTL bei den Devices abgelaufen ist oder nicht
                if((+internal.devices[devAddress].__timestamp + +internal.TTL) > Number(+new Date())) {
                    deviceList[devAddress] = internal.devices[devAddress];
                } else {
                    // Lösche den
                    delete internal.devices[devAddress];
                }
            }
          } else {
              deviceList[devAddress] =internal.devices[devAddress];
            }
        }
        return deviceList;
    }


    /*
    Function to get all detected devices
     */
    SensorAPI.getAllDetectedDevices = function() {
        return internal.detectedDevices;
    }

	/*
		Set filter
	*/
	SensorAPI.setFilter = function(filter) {
		//check if filter has the conform format
		// Must be an array
		var filterSet = false;
		if(filter) {
			internal.filter = filter;
			filterSet = true;
		} else {
			console.log("error: Filter criteria must be in an array");
		}
		return filterSet;
	}

	SensorAPI.getFilter = function() {
		return internal.filter;
	}

  // Driver Exception
  function driverException(message) {
    this.message = message;
    this.name = "Driver Exception.";
  }

  // Checking functions for driver interface
  internal.checkMandatoryInterface = function(loadedDriver, interfaceArray) {
    interfaceArray.forEach(function(element) {
      if(!(loadedDriver[element.name] && typeof loadedDriver[element.name] == element.type)) {
        if(element.replace) {
          loadedDriver.ID = element.replace;
        } else {
          throw new driverException("MandantoryInterfaceNotAvailable"+element.name);
        }
      }
    });
  }

  internal.checkOptionalInterface = function(loadedDriver, interfaceArray) {
    interfaceArray.forEach(function(element) {
      if(!(loadedDriver[element] && typeof loadedDriver[element] === "function")) {
        loadedDriver[element] = function(){};
      }
    });
  }


  SensorAPI.loadDriver = function(driver, options) {


    if(!internal.drivers[driver]) {
      //Hole die scripte anhand der registrierten scanner-treiber in internal.scanners
      $.getScript(driver, function (data, textStatus, jqxhr) {
        if(jqxhr.status == 200 || jqxhr.status == "200"){
            var loadedDriver = eval(data);

            // Check if driver has the mandantory functionsn parameter
            // ID, onDeviceAdded, onDeviceRemoved, Description
            try {
              internal.checkMandatoryInterface(
                loadedDriver,
                [{name:"ID", type:"string", replace: driver},
                {name: "onDeviceAdded", type: "function"},
                {name: "onDeviceRemoved", type: "function"}
              ]);
            } catch(e) {
              console.log(e.message);
            }

            //Check for optional properties, functions
            // initialize, finalize
            internal.checkOptionalInterface(loadedDriver, ["finalize", "initialize"] );

            internal.drivers[driver] = loadedDriver;
            internal.drivers[driver].onDeviceAdded(function(dev) {internal.storeDevice(dev,driver);}, options);

            internal.drivers[driver].onDeviceRemoved(internal.removeDevice);


        }
      });
    }
  }

  SensorAPI.unloadDriver = function(driver) {
    if(internal.drivers[driver]) {
      internal.drivers[driver] = null;
      console.log("Driver: " + driver + " removed.")
      return true;
    } else {
      console.log("No such driver available to be removed: " + driver);
      return false;
    }
  }

  SensorAPI.getAllDrivers = function() {
    return internal.drivers;
  }

  SensorAPI.getDriver = function(driver) {
	   if(driver) {
	    	return internal.drivers[driver];
	   } else {
	   	console.log("No driver path was passed in SensorAPI.getDriver. Usage: getDriver(pathToDriver)");
	   	return null;
	   }
   }


    return SensorAPI;
});

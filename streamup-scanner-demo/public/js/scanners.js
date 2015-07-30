/*  This the abstraction layer above of the hardware layer
    This contains the ability to execute each forwarded scanner like btle for bluetooth low energy, or over a server
*/

/*TODO:
 */


// The main scanner object
var scanner = (function(driver,options){

    //To be returned scanner object
    var scanner = {};

    //Make scanner variable a DOM variable
    scanner = document.createElement("object");

    //Holds internal functions
    var internal = {};

    // Registered scanner
    internal.scanners = [];

    // Setting sensor filter, when looking for specific sensors
    internal.filter = [];

    // Storing the driver objects
    scanner.drivers = [];

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
    scanner.events = {
        deviceUpdated:"deviceUpdated",
        deviceAdded: "deviceAdded",
        deviceRemoved: "deviceRemoved"
      };

    //Setzte TTL für sensoren
    if(options && options.setTTL) {
    	//console.log("Time To Live TTL set to: " + options.setTTL);
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

    /* Execution function of the forwarded scanner
       Params
       win      callback in case of success
       fail     callback in case of fail
       filter   array of string filter
    */
    scanner.startScan = function() {

        //Hole die scripte anhand der registrierten scanner-treiber in internal.scanners
        for(var driver in internal.scanners) {
            (function(driver) {
              $.getScript(internal.scanners[driver].driver, function (data, textStatus, jqxhr) {
                if(jqxhr.status == 200 || jqxhr.status == "200"){
                    scanner.drivers.push(eval(data));
                    if(scanner.drivers[scanner.drivers.length-1].startScan) {
                      scanner.drivers[driver].startScan(internal.storeDevice, internal.failFunction);
                    }
                }
            });
          })(driver);
        }
    };



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
     internal.storeDevice = function(device) {
     	var stringSensor = "";
     	for(var dev in device) {
     		//Check if the sensors is already in internal.devices
     		if(device.address != undefined) {
     			//stringSensor = JSON.stringify(device.services);

     			if(device.services) {
     				//Adding getServices Function
     				device.getServices = function() {
     					return device.services;
     				}

     			}

                if(internal.filterBySensorType(device.services)) {
					          // Überprüfe ob der Sensor bereits bekannt ist und im internal.devices vorhanden ist.
                    if(!internal.devices[device.address]) {
                        //Speicher welcher treiber verwendet wird
                        internal.devices[device.address] = device;
                        //Speicher in jemals gefundenen array
                        internal.detectedDevices[device.address] = device;

                        var event = new CustomEvent(scanner.events.deviceAdded, {detail:device},false,false);
                        // document.dispatchEvent(event);
                        scanner.dispatchEvent(event);
                        //$(scanner).trigger(scanner.events.deviceAdded,device);
                    } else {

                        // Falls er bereits existiert, dann aktualisere die Daten
                        $.each(device,function(index, value){
                            if(internal.devices[device.address] && internal.devices[device.address][index]) {
                                // Update sensor in the localStorage
                                internal.devices[device.address][index] = device[index];
                            }
                        });
                        //console.log("updated device: " + internal.devices[device.address].name);
                        internal.detectedDevices[device.address] = internal.devices[device.address];
                        var event = new CustomEvent(scanner.events.deviceUpdated, {detail:internal.devices[device.address]},false,false);
                        // document.dispatchEvent(event);
                        scanner.dispatchEvent(event);
                        //$(scanner).trigger(scanner.events.deviceUpdated,internal.devices[device.address]);
                    }


                    //Adding corresponding webworker, driver and the current time as timestamp.
                    internal.devices[device.address].__timestamp = Number(+new Date());

					if(internal.timeouts[device.address]) {
						clearTimeout(internal.timeouts[device.address]);
					}

          if(device.rssi) {
            // Only when a TTL value is set.
            if(internal.TTL && device.rssi == -999) {
              //internal.timeouts[device.address] = setTimeout(function() {internal.removeDevice(device);}, internal.TTL);
            }
          } else {
            if(internal.TTL) {
              internal.timeouts[device.address] = setTimeout(function() {internal.removeDevice(device);}, internal.TTL);
            }
          }

				}
     		}

     	}

     }
     scanner.onDeviceAdded = function(callback) {
       var stdCallback = function(device) {
         console.log("Device : " + device.name + " (address: " + device.address  +") added.");
       }

       // Schaue ob ein callback übergeben wurde
       // sonst nutze den oben deklarierten Standardcallback
       callback = callback ? callback : stdCallback;
       scanner.addEventListener(scanner.events.deviceAdded, function(obj) {
         callback(obj.detail);
       });
     }

     scanner.onDeviceUpdated= function(callback) {
       var stdCallback = function(device) {
         console.log("Device : " + device.name + " (address: " + device.address  +") updated.");
       }

       // Schaue ob ein callback übergeben wurde
       // sonst nutze den oben deklarierten Standardcallback
       callback = callback ? callback : stdCallback;

       scanner.addEventListener(scanner.events.deviceUpdated, function(obj) {
         callback(obj.detail);
       });
     }

     scanner.onDeviceRemoved= function(callback) {
       var stdCallback = function(device) {
         console.log("Device : " + device.name + " (address: " + device.address  +") removed.");
       }

       // Schaue ob ein callback übergeben wurde
       // sonst nutze den oben deklarierten Standardcallback
       callback = callback ? callback : stdCallback;

       scanner.addEventListener(scanner.events.deviceRemoved, function(obj) {
         callback(obj.detail);
       });
     }


     // Remove device
     internal.removeDevice = function(device) {
       var event = new CustomEvent(scanner.events.deviceRemoved, {detail:device},false,false);
       scanner.dispatchEvent(event);
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


    //Custom event trigger on within this namespace
    internal.trigger = function(event,data){
        //$(scanner).trigger(event,data);
    }


    //
    scanner.getAllDevices = function() {
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
    scanner.getAllDetectedDevices = function() {
        return internal.detectedDevices;
    }

    /*
    	Stop scanning function
    */
	scanner.stopScan = function() {
		for(driver in scanner.drivers) {
			scanner.drivers[driver].stopScan();
		}

	}

	/*
		Set filter
	*/
	scanner.setFilter = function(filter) {
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

	scanner.getFilter = function() {
		return internal.filter;
	}

  scanner.getTTL = function() {
    return internal.TTL;
  }

  scanner.setTTL = function(ttl) {
        var is_setTTL = false;
          if(!isNaN(ttl)){
            internal.TTL = ttl;
            is_setTTL = true;
          }
          return is_setTTL;
      }

  scanner.addDriver = function(driver) {
    if(driver) {
      internal.scanners.push({"driver": driver, "args":null});
    } else {
      console.log("Driver: " + driver + " could not be included");
    }
  }

    //Register driver
    if(driver) {
      internal.register(driver);
    } else {
      console.log("No valid driver passed");
    }
    return scanner;
});

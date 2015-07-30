/**
 * File: easyble.js
 * Description: Library for making BLE programming easier.
 * Author: Miki
 *
 * Note: The object type called "device" below, is the "DeviceInfo"
 * object obtained by calling evothings.ble.startScan, enhanced with
 * additional properties and functions to allow easy access to
 * object methods. Properties are also added to the Characteristic
 * and Descriptor object. Added properties are prefixed with two
 * underscores.
 */

evothings.loadScript('libs/evothings/util/util.js');

var base64 = cordova.require('cordova/base64');

// Object that holds BLE data and functions.
evothings.easyble = (function()
{
    /** Main object in the EasyBLE API. */
    var easyble = {};

    /**
     * Set to true to report found devices only once,
     * set to false to report continuously.
     */
    var reportDeviceOnce = false;

    var serviceFilter = false;

    /** Internal properties and functions. */
    var internal = {};

    /** Internal variable used to track reading of service data. */
    var readCounter = 0;

    /** Table of discovered devices. */
    internal.knownDevices = {};

    /** Table of connected devices. */
    internal.connectedDevices = {};


    /** Mein eigener Speicher für die Devices **/
    internal.myOwnDevices = {};

    /** Device Treiber Methoden **/
    internal.deviceDrivers = [
    	{
    		device: "SensorTag", //gleichzeitig als Filtername verwendet
    		driver: "libs/driver/devices/tisensortag.js"
    	},
    	{
    		device: "bPart2", //gleichzeitig als Filtername verwendet
    		driver: "libs/driver/devices/bPart.js"
    	}

    ];

    // globale interne variable die den storing fucntion abspeichert
    internal.globalWin;

    /**
     * Set to true to report found devices only once.
     * Set to false to report continuously.
     * The default is to report continously.
     */
    easyble.reportDeviceOnce = function(reportOnce)
    {
        reportDeviceOnce = reportOnce;
    };

    /**
     * Set to an Array of UUID strings to enable filtering of devices found by startScan().
     * Set to false to disable filtering.
     * The default is to not filter.
     * An empty array will cause no devices to be reported.
     */
    easyble.filterDevicesByService = function(services)
    {
        serviceFilter = services;
    };

    /** Start scanning for devices. */
    easyble.startScan = function(win, fail)
    {
        easyble.stopScan();
        internal.knownDevices = {};
        evothings.ble.startScan(function(device)
            {
                // Ensure we have advertisementData.
                internal.ensureAdvertisementData(device);

                // Check if the device matches the filter, if we have a filter.
                if(!internal.deviceMatchesServiceFilter(device)) {
                    return;
                }

                // Check if we already have got the device.
                var existingDevice = internal.knownDevices[device.address]
                //check if for the given device.name a driver exists

				internal.globalWin = win;


                if (existingDevice)
                {
                    // Do not report device again if flag is set.
                    if (reportDeviceOnce) { return; }

                    // Flag not set, report device again.
                    existingDevice.rssi = device.rssi;
                    existingDevice.name = device.name;
                    existingDevice.scanRecord = device.scanRecord;
                    existingDevice.advertisementData = device.advertisementData;
                    win(existingDevice);
                    return;
                }
                //if(device && device.name && device.name.indexOf("Sensor Tag") > -1 && !device.services) {
                	//if(!existingDevice.services) {
                		//Hole den entsprechenden Treiber für den TI Sensor Tag
						for(var driver in internal.deviceDrivers) {
							if(!internal.deviceDrivers[driver].driverObject) {
								$.ajax({
									  url: internal.deviceDrivers[driver].driver,
									  dataType: "script",
									  async: false,
									  error: function(jqxhr, status, error) {
										console.log("Loading device driver error: " + error);

									  },
									  success: function(data) {
										internal.deviceDrivers[driver].driverObject = {};
										internal.deviceDrivers[driver].driverObject = eval(data);

									  }


									});


								}
						}
					//}
                //}



                //device = internal.addDeviceMethods(device);

                // New device, add to known devices.
                internal.knownDevices[device.address] = device;

                // Add methods to the device info object.
                internal.addMethodsToDeviceObject(device);
                // Call callback function with device info.
				//
                internal.connectToDevice(
                	device,
                	win,
                	function(error){console.log("Could not connect. " + JSON.stringify(error));},
                	true,
                	true
                );


                //win(device);
            },
            function(errorCode)
            {
                fail(errorCode);
            });
    };

    /** Stop scanning for devices. */
    easyble.stopScan = function()
    {
        evothings.ble.stopScan();
    };

    /** Close all connected devices. */
    easyble.closeConnectedDevices = function()
    {
        for (var key in internal.connectedDevices)
        {
            var device = internal.connectedDevices[key];
            device && device.close();
            internal.connectedDevices[key] = null;
        }
    };

    easyble.getDevices = function () {
        return internal.knownDevices;
    };

    /**
     * If device has advertisementData, does nothing.
     * If device instead has scanRecord, creates advertisementData.
     * See ble.js for AdvertisementData reference.
     */
    internal.ensureAdvertisementData = function(device)
    {
        // If device object already has advertisementData we
        // do not need to parse the scanRecord.
        if (device.advertisementData) { return; }

        // Must have scanRecord to continue.
        if (!device.scanRecord) { return; }

        // Here we parse BLE/GAP Scan Response Data.
        // See the Bluetooth Specification, v4.0, Volume 3, Part C, Section 11,
        // for details.

        var byteArray = evothings.util.base64DecToArr(device.scanRecord);
        var pos = 0;
        var advertisementData = {};
        var serviceUUIDs;
        var serviceData;

        // The scan record is a list of structures.
        // Each structure has a length byte, a type byte, and (length-1) data bytes.
        // The format of the data bytes depends on the type.
        // Malformed scanRecords will likely cause an exception in this function.
        while (pos < byteArray.length)
        {
            var length = byteArray[pos++];
            if (length == 0)
            {
                break;
            }
            length -= 1;
            var type = byteArray[pos++];

            // Parse types we know and care about.
            // Skip other types.

            var BLUETOOTH_BASE_UUID = '-0000-1000-8000-00805f9b34fb'

            // Convert 16-byte Uint8Array to RFC-4122-formatted UUID.
            function arrayToUUID(array, offset)
            {
                var k=0;
                var string = '';
                var UUID_format = [4, 2, 2, 2, 6];
                for (var l=0; l<UUID_format.length; l++)
                {
                    if (l != 0)
                    {
                        string += '-';
                    }
                    for (var j=0; j<UUID_format[l]; j++, k++)
                    {
                        string += evothings.util.toHexString(array[offset+k], 1);
                    }
                }
                return string;
            }

            if (type == 0x02 || type == 0x03) // 16-bit Service Class UUIDs.
            {
                serviceUUIDs = serviceUUIDs ? serviceUUIDs : [];
                for(var i=0; i<length; i+=2)
                {
                    serviceUUIDs.push(
                        '0000' +
                        evothings.util.toHexString(
                            evothings.util.littleEndianToUint16(byteArray, pos + i),
                            2) +
                        BLUETOOTH_BASE_UUID);
                }
            }
            if (type == 0x04 || type == 0x05) // 32-bit Service Class UUIDs.
            {
                serviceUUIDs = serviceUUIDs ? serviceUUIDs : [];
                for (var i=0; i<length; i+=4)
                {
                    serviceUUIDs.push(
                        evothings.util.toHexString(
                            evothings.util.littleEndianToUint32(byteArray, pos + i),
                            4) +
                        BLUETOOTH_BASE_UUID);
                }
            }
            if (type == 0x06 || type == 0x07) // 128-bit Service Class UUIDs.
            {
                serviceUUIDs = serviceUUIDs ? serviceUUIDs : [];
                for (var i=0; i<length; i+=16)
                {
                    serviceUUIDs.push(arrayToUUID(byteArray, pos + i));
                }
            }
            if (type == 0x08 || type == 0x09) // Local Name.
            {
                advertisementData.kCBAdvDataLocalName = evothings.ble.fromUtf8(
                    new Uint8Array(byteArray.buffer, pos, length));
            }
            if (type == 0x0a) // TX Power Level.
            {
                advertisementData.kCBAdvDataTxPowerLevel =
                    evothings.util.littleEndianToInt8(byteArray, pos);
            }
            if (type == 0x16) // Service Data, 16-bit UUID.
            {
                serviceData = serviceData ? serviceData : {};
                var uuid =
                    '0000' +
                    evothings.util.toHexString(
                        evothings.util.littleEndianToUint16(byteArray, pos),
                        2) +
                    BLUETOOTH_BASE_UUID;
                var data = new Uint8Array(byteArray.buffer, pos+2, length-2);
                serviceData[uuid] = base64.fromArrayBuffer(data);
            }
            if (type == 0x20) // Service Data, 32-bit UUID.
            {
                serviceData = serviceData ? serviceData : {};
                var uuid =
                    evothings.util.toHexString(
                        evothings.util.littleEndianToUint32(byteArray, pos),
                        4) +
                    BLUETOOTH_BASE_UUID;
                var data = new Uint8Array(byteArray.buffer, pos+4, length-4);
                serviceData[uuid] = base64.fromArrayBuffer(data);
            }
            if (type == 0x21) // Service Data, 128-bit UUID.
            {
                serviceData = serviceData ? serviceData : {};
                var uuid = arrayToUUID(byteArray, pos);
                var data = new Uint8Array(byteArray.buffer, pos+16, length-16);
                serviceData[uuid] = base64.fromArrayBuffer(data);
            }
            if (type == 0xff) // Manufacturer-specific Data.
            {
                // Annoying to have to transform base64 back and forth,
                // but it has to be done in order to maintain the API.
                advertisementData.kCBAdvDataManufacturerData =
                    base64.fromArrayBuffer(new Uint8Array(byteArray.buffer, pos, length));
            }

            pos += length;
        }
        advertisementData.kCBAdvDataServiceUUIDs = serviceUUIDs;
        advertisementData.kCBAdvDataServiceData = serviceData;
        device.advertisementData = advertisementData;

        /*
         // Log raw data for debugging purposes.
         var srs = ''
         for(var i=0; i<byteArray.length; i++) {
         srs += evothings.util.toHexString(byteArray[i], 1);
         }
         console.log("scanRecord: "+srs);

         console.log(JSON.stringify(advertisementData));
         */
    }

    /**
     * Returns true if the device matches the serviceFilter, or if there is no filter.
     * Returns false otherwise.
     */
    internal.deviceMatchesServiceFilter = function(device)
    {
        if (!serviceFilter) { return true; }

        var advertisementData = device.advertisementData;
        if (advertisementData)
        {
            if (advertisementData.kCBAdvDataServiceUUIDs)
            {
                for (var i in advertisementData)
                {
                    for (var j in serviceFilter)
                    {
                        if (advertisementData[i].toLowerCase() ==
                            serviceFilter[j].toLowerCase())
                        {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * Add functions to the device object to allow calling them
     * in an object-oriented style.
     */
    internal.addMethodsToDeviceObject = function(device)
    {
        /** Connect to the device. */
        device.connect = function(win, fail)
        {
            internal.connectToDevice(device, win, fail);
        };

        /** Close the device. */
        device.close = function()
        {
            device.deviceHandle && evothings.ble.close(device.deviceHandle);
            internal.connectedDevices[device.address] = null;

        };

        /** Read devices RSSI. Device must be connected. */
        device.readRSSI = function(win, fail)
        {
            evothings.ble.rssi(device.deviceHandle, win, fail);
        };

        /**
         * Read all service info for the specified service UUIDs.
         * @param serviceUUIDs - array of UUID strings
         * @param win - success callback
         * @param fail - error callback
         * If serviceUUIDs is null, info for all services is read
         * (this can be time-consuming compared to reading a
         * selected number of services).
         */
        device.readServices = function(serviceUUIDs, win, fail, closeDevices)
        {
            internal.readServices(device, serviceUUIDs, win, fail, closeDevices);
        };

        /** Read value of characteristic. */
        device.readCharacteristic = function(characteristicUUID, win, fail)
        {
            internal.readCharacteristic(device, characteristicUUID, win, fail);
        };

        /** Read value of descriptor. */
        device.readDescriptor = function(characteristicUUID, descriptorUUID, win, fail)
        {
            internal.readDescriptor(device, characteristicUUID, descriptorUUID, win, fail);
        };

        /** Write value of characteristic. */
        device.writeCharacteristic = function(characteristicUUID, value, win, fail)
        {
            internal.writeCharacteristic(device, characteristicUUID, value, win, fail);
        };

        /** Write value of descriptor. */
        device.writeDescriptor = function(characteristicUUID, descriptorUUID, value, win, fail)
        {
            internal.writeDescriptor(device, characteristicUUID, descriptorUUID, value, win, fail);
        };

        /** Subscribe to characteristic value updates. */
        device.enableNotification = function(characteristicUUID, win, fail)
        {
            internal.enableNotification(device, characteristicUUID, win, fail);
        };


        /** Unsubscribe from characteristic updates. */
        device.disableNotification = function(characteristicUUID, win, fail)
        {
            internal.disableNotification(device, characteristicUUID, win, fail);
        };




    };

    /** Connect to a device. */
    internal.connectToDevice = function(device, win, fail, readServices, closeDevices)
    {
    	readServices = readServices ? readServices : false;
    	closeDevices = closeDevices ? closeDevices : false;

        evothings.ble.connect(device.address, function(connectInfo)
            {
                if (connectInfo.state == 2) // connected
                {
					//my part
					//After connecting readServices
					if(readServices) {
						//not my part
					    device.deviceHandle = connectInfo.deviceHandle;
                    	device.__uuidMap = {};
                    	internal.connectedDevices[device.address] = device;
                    	//not my part
						device.readServices(null, win, fail, closeDevices);
					} else {
						//not my part
					    device.deviceHandle = connectInfo.deviceHandle;
                    	device.__uuidMap = {};
                    	internal.connectedDevices[device.address] = device;
                    	//not my part

					}
					//my part ending
                    //win(device);
                }
                else if (connectInfo.state == 0) // disconnected
                {
                    internal.connectedDevices[device.address] = null;
                    console.log("disconnecting and setting to null: " + device.name);
                    // TODO: How to signal disconnect?
                    // Call error callback?
                    // Additional callback? (connect, disconnect, fail)
                    // Additional parameter on win callback with connect state?
                    // (Last one is the best option I think).
                    fail && fail('disconnected');
                }
            },
            function(errorCode)
            {
                fail(errorCode);
            });
    };

    /**
     * Obtain device services, them read characteristics and descriptors
     * for the services with the given uuid(s).
     * If serviceUUIDs is null, info is read for all services.
     */
    internal.readServices = function(device, serviceUUIDs, win, fail, closeDevices)
    {
    	closeDevices = closeDevices ? closeDevices : false;
        // Read services.
        evothings.ble.services(
            device.deviceHandle,
            function(services)
            {
                // Array that stores services.
                device.__services = [];
				device.services = {};
				var driverMethods;
                for (var i = 0; i < services.length; ++i)
                {
                    var service = services[i];
                    service.uuid = service.uuid.toLowerCase();
                    device.__services.push(service);
                    device.__uuidMap[service.uuid] = service;
                    driverMethods = internal.addDriverMethods(device, service.uuid);
                    for(var method in driverMethods) {
                    	device.services[method] = driverMethods[method];
                    }
                }


                internal.readCharacteristicsForServices(
                    device, serviceUUIDs, win, fail, closeDevices);
            },
            function(errorCode)
            {
                fail(errorCode);
            });
    };

    /**
     * Read characteristics and descriptors for the services with the given uuid(s).
     * If serviceUUIDs is null, info for all services are read.
     * Internal function.
     */
    internal.readCharacteristicsForServices = function(device, serviceUUIDs, win, fail, closeDevices)
    {
        var characteristicsCallbackFun = function(service)
        {
            // Array with characteristics for service.
            service.__characteristics = [];

            return function(characteristics)
            {
                --readCounter; // Decrements the count added by services.
                readCounter += characteristics.length;
                for (var i = 0; i < characteristics.length; ++i)
                {
                    var characteristic = characteristics[i];
                    characteristic.uuid = characteristic.uuid.toLowerCase();
                    service.__characteristics.push(characteristic);
                    device.__uuidMap[characteristic.uuid] = characteristic;
                    // Read descriptors for characteristic.
                    evothings.ble.descriptors(
                        device.deviceHandle,
                        characteristic.handle,
                        descriptorsCallbackFun(device,characteristic, closeDevices),
                        function(errorCode)
                        {
                            fail(errorCode);
                        });
                }
            };
        };

        var descriptorsCallbackFun = function(device, characteristic, closeDevice)
        {
            // Array with descriptors for characteristic.
            characteristic.__descriptors = [];
			//win(device);
            return function(descriptors)
            {
                --readCounter; // Decrements the count added by characteristics.
                for (var i = 0; i < descriptors.length; ++i)
                {
                    var descriptor = descriptors[i];
                    descriptor.uuid = descriptor.uuid.toLowerCase();
                    characteristic.__descriptors.push(descriptor);
                    device.__uuidMap[characteristic.uuid + ':' + descriptor.uuid] = descriptor;
                }
                if (0 == readCounter)
                {
                    // Everything is read.
                    console.log("everything is read...");
                    //device = internal.addDeviceMethods(device);
                    //device = internal.addDriverMethods(device);
                    internal.knownDevices[device.address] = device;

                    win(device);
					//internal.sensorOn();
					if(closeDevice) {
                    	device.close();
                    }

                }
            };
        };

        // Initialize read counter.
        readCounter = 0;
		//console.log("1 read characteristics for services....");
        if (null != serviceUUIDs)
        {
         //console.log("2 internal: reading characterisitc for services..." +  JSON.stringify(device));
		 //console.log("uuids.." +  JSON.stringify(serviceUUIDs.length));
            // Read info for service UUIDs.
            readCounter = serviceUUIDs.length;
            for (var i = 0; i < serviceUUIDs.length; ++i)
            {
                var uuid = serviceUUIDs[i].toLowerCase();
                var service = device.__uuidMap[uuid];
                if (!service)
                {
                    fail('Service not found: ' + uuid);
                    return;
                }

                // Read characteristics for service. Will also read descriptors.
                evothings.ble.characteristics(
                    device.deviceHandle,
                    service.handle,
                    characteristicsCallbackFun(service),
                    function(errorCode)
                    {
                        fail(errorCode);
                    });
            }
        }
        else
        {

            // Read info for all services.
            readCounter = device.__services.length;
            for (var i = 0; i < device.__services.length; ++i)
            {
                // Read characteristics for service. Will also read descriptors.
                var service = device.__services[i];
                evothings.ble.characteristics(
                    device.deviceHandle,
                    service.handle,
                    characteristicsCallbackFun(service),
                    function(errorCode)
                    {
                        fail(errorCode);
                    });
            }
        }
    };

    internal.readCharacteristic = function(device, characteristicUUID, win, fail)
    {
        characteristicUUID = characteristicUUID.toLowerCase();

        var characteristic = device.__uuidMap[characteristicUUID];
        if (!characteristic)
        {
            fail('Characteristic not found: ' + characteristicUUID);
            return;
        }

        evothings.ble.readCharacteristic(
            device.deviceHandle,
            characteristic.handle,
            win,
            fail);
    };

    internal.readDescriptor = function(device, characteristicUUID, descriptorUUID, win, fail)
    {
        characteristicUUID = characteristicUUID.toLowerCase();
        descriptorUUID = descriptorUUID.toLowerCase();

        var descriptor = device.__uuidMap[characteristicUUID + ':' + descriptorUUID];
        if (!descriptor)
        {
            fail('Descriptor not found: ' + descriptorUUID);
            return;
        }

        evothings.ble.readDescriptor(
            device.deviceHandle,
            descriptor.handle,
            value,
            function()
            {
                win();
            },
            function(errorCode)
            {
                fail(errorCode);
            });
    };

    internal.writeCharacteristic = function(device, characteristicUUID, value, win, fail)
    {

        characteristicUUID = characteristicUUID.toLowerCase();
        var characteristic = device.__uuidMap[characteristicUUID];
        if (!characteristic)
        {
            fail('Characteristic not found: ' + characteristicUUID);
            return;
        }

        evothings.ble.writeCharacteristic(
            device.deviceHandle,
            characteristic.handle,
            value,
            function()
            {
                win();
            },
            function(errorCode)
            {
                fail(errorCode);
            });
    };

    internal.writeDescriptor = function(device, characteristicUUID, descriptorUUID, value, win, fail)
    {
        characteristicUUID = characteristicUUID.toLowerCase();
        descriptorUUID = descriptorUUID.toLowerCase();

        var descriptor = device.__uuidMap[characteristicUUID + ':' + descriptorUUID];
        if (!descriptor)
        {
            fail('Descriptor not found: ' + descriptorUUID);
            return;
        }

        evothings.ble.writeDescriptor(
            device.deviceHandle,
            descriptor.handle,
            value,
            function()
            {
                win();
            },
            function(errorCode)
            {
                fail(errorCode);
            });
    };

    internal.enableNotification = function(device, characteristicUUID, win, fail)
    {
        characteristicUUID = characteristicUUID.toLowerCase();


        var characteristic = device.__uuidMap[characteristicUUID];
        if (!characteristic)
        {
            fail('Characteristic not found: ' + characteristicUUID);
            return;
        }

        evothings.ble.enableNotification(
            device.deviceHandle,
            characteristic.handle,
            win,
            fail);
    };

    internal.disableNotification = function(device, characteristicUUID, win, fail)
    {
        characteristicUUID = characteristicUUID.toLowerCase();

        var characteristic = device.__uuidMap[characteristicUUID];
        if (!characteristic)
        {
            fail('Characteristic not found: ' + characteristicUUID);
            return;
        }

        evothings.ble.disableNotification(
            device.deviceHandle,
            characteristic.handle,
            win,
            fail);
    };

    // For debugging. Example call:
    // easyble.printObject(device, console.log);
    easyble.printObject = function(obj, printFun)
    {
        function print(obj, level)
        {
            var indent = new Array(level + 1).join('  ');
            for (var prop in obj)
            {
                if (obj.hasOwnProperty(prop))
                {
                    var value = obj[prop];
                    if (typeof value == 'object')
                    {
                        printFun(indent + prop + ':');
                        print(value, level + 1);
                    }
                    else
                    {
                        printFun(indent + prop + ': ' + value);
                    }
                }
            }
        }
        print(obj, 0);
    };


    easyble.addMethods = function(device)
    {
        /** Connect to the device. */
        device.connect = function(win, fail)
        {
        	console.log("connecting...");
            internal.connectToDevice(device, win, fail);
        };

        /** Close the device. */
        device.close = function()
        {
            device.deviceHandle && evothings.ble.close(device.deviceHandle);
        };

        /** Read devices RSSI. Device must be connected. */
        device.readRSSI = function(win, fail)
        {
            evothings.ble.rssi(device.deviceHandle, win, fail);
        };

        /**
         * Read all service info for the specified service UUIDs.
         * @param serviceUUIDs - array of UUID strings
         * @param win - success callback
         * @param fail - error callback
         * If serviceUUIDs is null, info for all services is read
         * (this can be time-consuming compared to reading a
         * selected number of services).
         */
        device.readServices = function(serviceUUIDs, win, fail)
        {
            internal.readServices(device, serviceUUIDs, win, fail);
        };

        /** Read value of characteristic. */
        device.readCharacteristic = function(characteristicUUID, win, fail)
        {
            internal.readCharacteristic(device, characteristicUUID, win, fail);
        };

        /** Read value of descriptor. */
        device.readDescriptor = function(characteristicUUID, descriptorUUID, win, fail)
        {
            internal.readDescriptor(device, characteristicUUID, descriptorUUID, win, fail);
        };

        /** Write value of characteristic. */
        device.writeCharacteristic = function(characteristicUUID, value, win, fail)
        {
            internal.writeCharacteristic(device, characteristicUUID, value, win, fail);
        };

        /** Write value of descriptor. */
        device.writeDescriptor = function(characteristicUUID, descriptorUUID, value, win, fail)
        {
            internal.writeDescriptor(device, characteristicUUID, descriptorUUID, value, win, fail);
        };

        /** Subscribe to characteristic value updates. */
        device.enableNotification = function(characteristicUUID, win, fail)
        {
            internal.enableNotification(device, characteristicUUID, win, fail);
        };

        /** Unsubscribe from characteristic updates. */
        device.disableNotification = function(characteristicUUID, win, fail)
        {
            internal.disableNotification(device, characteristicUUID, win, fail);
        };
    };

    easyble.reset = function()
    {
        evothings.ble.reset();
    };






    internal.addDriverMethods = function(device, uuid) {
    	fun = {};
    	//find corresponding driver object
    	for(var driverObj in internal.deviceDrivers) {
    		if((device.name).indexOf(internal.deviceDrivers[driverObj].device) > -1) {
    			var deviceDriver = internal.deviceDrivers[driverObj].driverObject;
    			break;
    		}
    	}

    	for(var obj in deviceDriver) {
    		if(deviceDriver[obj].uuid.service && deviceDriver[obj].uuid.service == uuid) {
    			var driver = {};
    			driver.name =  obj;
    			driver.driver = deviceDriver[obj];


				if(driver.driver.uuid.configValue) {

					fun[obj] = (function(obj) {
						return function(callback) {
 						var callbackFun = function(data) {
							if(!callback) {
                console.log("no callback given. Default callback used.");
                callback = function(data) {console.log(data);}
              }

              callback(deviceDriver[obj].decoder(data));
							internal.globalWin(device);
						}

						var switchOn = function(device) {
							internal.knownDevices[device.address] = device;
							internal.sensorOn(device,
								deviceDriver[obj].uuid.config,
								deviceDriver[obj].uuid.configValue, //on
								deviceDriver[obj].uuid.period,
								deviceDriver[obj].uuid.periodValue,
								deviceDriver[obj].uuid.data,
								deviceDriver[obj].uuid.notification,
								callbackFun
							);
						}

				if(!internal.connectedDevices[device.address]) {
    				//First connect to the device
    				internal.connectToDevice(device, switchOn, function(e){console.log("error connection again");}, true, false);
    			} else {
    				switchOn(device);
    			}

					}
					})(obj, deviceDriver[obj]);
				} else {
					fun[obj] = (function(obj) {
						return function(callback) {

						internal.sensorOff(device, deviceDriver[obj].uuid.data, deviceDriver[obj].uuid.config);
						device.close();
						callback();
					}
					})(obj, deviceDriver[obj]);

				}
    		}
    	}





    	return fun;
    }


    		/**
		 * Private/public. Helper function for turning on sensor notification.
		 * You can call this function from the application to enables sensors
		 * using custom parameters (advanced use).
		 */


		internal.sensorOn = function(device,
			configUUID,
			configValue,
			periodUUID,
			periodValue,
			dataUUID,
			notificationUUID,
			notificationFunction)
		{


			errorFun = function(error) {
				console.log("error : " + error);
			}

		connectCallback = function () {
			// Only start sensor if a notification function has been set.
			if (!notificationFunction) { return }

			// Set sensor configuration to ON.
			configUUID && internal.writeCharacteristic(device,
				configUUID,
				new Uint8Array([configValue]),
				function() {},
				errorFun)

			// Set sensor update period.
			periodUUID && periodValue && internal.writeCharacteristic(device,
				periodUUID,
				new Uint8Array([periodValue / 10]),
				function() {},
				errorFun)

			// Set sensor notification to ON.
			dataUUID && notificationUUID && internal.writeDescriptor(device,
				dataUUID, // Characteristic for data
				notificationUUID, // Configuration descriptor
				new Uint8Array([1,0]),
				function() {},
				errorFun)

			// Start sensor notification.
			dataUUID && internal.enableNotification(device,
				dataUUID,
				function(data) { notificationFunction(new Uint8Array(data)) },
				errorFun);

				}
			//internal.connectToDevice(device, connectCallback, errorFun ,false);
			connectCallback();

		}

		/**
		 * Helper function for turning off sensor notification.
		 */

		internal.sensorOff = function(device, dataUUID, configUUID)
		{
			errorFun = function(e) {console.log("Sensor off error: " + e);}

			// Set sensor configuration to OFF
			configUUID && internal.writeCharacteristic(device,
				configUUID,
				new Uint8Array([0]),
				function() {},
				errorFun)

			dataUUID && internal.disableNotification(device,
				dataUUID,
				function() {},
				errorFun)

		}

		internal.bufferToHexStr = function(buffer, offset, numBytes)
		{
		var hex = ''
		for (var i = 0; i < numBytes; ++i)
		{
			hex += internal.byteToHexStr(buffer[offset + i])
		}
		return hex
		}

			/**
	 * Convert byte number to hex string.
	 */
	internal.byteToHexStr = function(d)
	{
		if (d < 0) { d = 0xFF + d + 1 }
		var hex = Number(d).toString(16)
		var padding = 2
		while (hex.length < padding)
		{
			hex = '0' + hex
		}


		return hex
	}

	internal.addDeviceMethods = function(device) {
		for(var driver in internal.deviceDrivers) {
			if(device && device.name && device.name.indexOf(internal.deviceDrivers[driver].device) > -1 && internal.deviceDrivers[driver].driverObject) {
				device.services = {};
				for(var i in internal.deviceDrivers[driver].driverObject) {
					if(internal.deviceDrivers[driver].driverObject[i].uuid.configValue) {

						device.services[i] = (function(i,driver) {
							return function(callback) {

								var callbackFunction = internal.deviceDrivers[driver].driverObject[i].decoder(callback);

								var sensorOn = function() {
									device = internal.connectedDevices[device.address];
									internal.sensorOn(
											device,
											internal.deviceDrivers[driver].driverObject[i].uuid.config,
											internal.deviceDrivers[driver].driverObject[i].uuid.configValue, //on
											internal.deviceDrivers[driver].driverObject[i].uuid.period,
											internal.deviceDrivers[driver].driverObject[i].uuid.periodValue,
											internal.deviceDrivers[driver].driverObject[i].uuid.data,
											internal.deviceDrivers[driver].driverObject[i].uuid.nofitication,
											callbackFunction
										);


								}

								if(internal.connectedDevices[device.address]) {
									sensorOn();
								} else {
									device = internal.connectToDevice(device, sensorOn, function(e) {console.log("failed connect :" + e);}, false);
								}

							}
						})(i,driver);
					} else {
						device.services[i] = (function(i,device,driver) {
							return function(callback) {

								var sensorOff = function() {
									device = internal.connectedDevices[device.address];

									internal.sensorOff(
										device,
										internal.deviceDrivers[driver].driverObject[i].uuid.data,
										internal.deviceDrivers[driver].driverObject[i].uuid.config
									);
								}

								console.log("sensor off created");

								if(internal.connectedDevices[device.address]) {
									console.log("activate sensor off already connected sensor");
									sensorOff();
								}

							}
						})(i,device,driver);

					}
				}
			}
		}
		for(var d in device.services) {
			console.log(d);
		}

		return device;
	}

    return easyble;
})();




// Object that holds BLE data and functions.
btle = (function()
{
    
    
    
    
var btle = {};

    
btle.services = {
    DEVICEINFO_SERVICE : '0000180a-0000-1000-8000-00805f9b34fb',
    FIRMWARE_DATA : '00002a26-0000-1000-8000-00805f9b34fb',

    IRTEMPERATURE_SERVICE : 'f000aa00-0451-4000-b000-000000000000',
    IRTEMPERATURE_DATA : 'f000aa01-0451-4000-b000-000000000000',
    IRTEMPERATURE_CONFIG : 'f000aa02-0451-4000-b000-000000000000',
    IRTEMPERATURE_PERIOD : 'f000aa03-0451-4000-b000-000000000000',
    IRTEMPERATURE_NOTIFICATION : '00002902-0000-1000-8000-00805f9b34fb',

    ACCELEROMETER_SERVICE : 'f000aa10-0451-4000-b000-000000000000',
    ACCELEROMETER_DATA : 'f000aa11-0451-4000-b000-000000000000',
    ACCELEROMETER_CONFIG : 'f000aa12-0451-4000-b000-000000000000',
    ACCELEROMETER_PERIOD : 'f000aa13-0451-4000-b000-000000000000',
    ACCELEROMETER_NOTIFICATION : '00002902-0000-1000-8000-00805f9b34fb'
};


    btle.services2 = {

        HUMIDITY_SERVICE : 'f000aa20-0451-4000-b000-000000000000',
        HUMIDITY_DATA : 'f000aa21-0451-4000-b000-000000000000',
        HUMIDITY_CONFIG : 'f000aa22-0451-4000-b000-000000000000',
        HUMIDITY_PERIOD : 'f000aa23-0451-4000-b000-000000000000',
        HUMIDITY_NOTIFICATION : '00002902-0000-1000-8000-00805f9b34fb'
    };

    //Mapping function
    btle.mappingService = function (device) {

        var services = [];
        var deviceStr = JSON.stringify(device);

        //UUID from TI Sensor Tag
        // Check if the device contains servies ids about IR-temperature

        if(deviceStr.indexOf('f000aa01-0451-4000-b000-000000000000')>-1) {
            // It has an ir-temperature sensor
            services.push({
                type: 'read',
                uuid: 'f000aa01-0451-4000-b000-000000000000',
                name: 'IRTemperature',
                exe: 'reading'

            });

        }


        if(deviceStr.indexOf('f000aa10-0451-4000-b000-000000000000')>-1) {
            // It has an ir-temperature sensor
            services.push({
                type: 'read',
                uuid: 'f000aa10-0451-4000-b000-000000000000',
                name: 'Acceleration',
                exe: 'reading'
            });

        }

        if(deviceStr.indexOf('f000aa20-0451-4000-b000-000000000000')>-1) {
            // It has an ir-temperature sensor
            services.push({
                type: 'read',
                uuid: 'f000aa20-0451-4000-b000-000000000000',
                name: 'humidity',
                exe: 'reading'
            });

        }

        return services;
    }


btle.scan = function() {

    var result = {};


    //BT Dummy scanned devices
    result = [
        {

            "address":     '00:07:80:1B:5C:80',
            "name":        'bsPart 1B:5C:80',
            "rssi":        Math.floor(Math.random() * (-127)) + (-1),
            "type":         'magneto',
            "services": btle.services2
        },
        {

            "address":     'B4:99:4C:64:CB:96',
            "name":        'SsensorTag',
            "rssi":        Math.floor(Math.random() * (-127)) + (-1),
            "type":         'magneto',
            "services":     btle.services
        }
        ];

    //mapping function to find services and add the correct for the driver conform msg

    result = result.map(function(device){
            device.services = btle.mappingService(device);
            return device;
        }

    );

    return result;
};


btle.irtemperature = function() {


        var result = {};

        result =  Math.floor(Math.random() * (5)) + (-5);


        return result;
    };

btle.stopScan = function() {

};


    return btle;
})();

self.addEventListener('message', function(e) {
    if(e.data.msg == "scan") {
        setInterval(function(){
            self.postMessage(btle.scan());
        },2000);
    } else if (e.data.msg == "readSensor") {
        console.log("magnet message: " + e.data.msg);
        setInterval(function(){
            self.postMessage(btle.magnet());
        },2000);
    } else if (e.data.exe == "reading") {
        setInterval(function(){

            self.postMessage(btle.irtemperature());
        }, (Math.random() * 500) + 500);
    }
},false);






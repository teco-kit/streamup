README of WebRTC Driver for Scanners.js-API
===========================================

This README lists and explains its public APIs.
In Scanners.js when driver is loaded. A device will passed to the Scanners.js-API over onDeviceAdded.
The sensors which this driver provides are accessible within the Scanners.js-API over 'device.sensors'.

* Principle of WebRTC
----------------------
Here will be no long explanation of how WebRTC works in detail. Instead a short and complete explanation will be given to understand how it works.

* Scenario: Two browsers want to connect to each other. (Browser1 and Browser2)

1. Step: Browser1 creates an offer and makes it somewhere available or passed it directly to the Browser2 e.g. via messenger (Whatsapp).
  1. Meanwhile: Browser1 will set his created offer as his local description.
2. Step: Browser2 gets the offer from somewhere or got it passed by Browser1.  
  1. Offer received: Browser2 will set the received offer as the remote description.
3. Step: Browser2 will create based on the offer his answer and passes it to Browser1.
  1. Meanwhile: Browser2 set his answer as his local description.
4. Step: Browser1 receives the answer and set it as his remote description.
5. Connection is established.

Therefore when the SensorAPI.js API uses this driver, the neccessary methods (driverMethods)
are provided to build up a connection

The provided driverMethods are:

createOffer([callback])
-----------------------
When the offer is generated the callback will be invoked and get passed one
parameter which is the offer.
For example:
```javascript
  driver.driverMethods.createOffer(function(offer) {
    console.log("Offer created: " + offer);
  });
```

createAnswer(offer, [callback])
-----------------------
To create an answer, the offer and an optional callback must be passed.
The callback will be executed when the is answer is created.
For example:
```javascript
  driver.driverMethods.createAnswer(offer, function(answer) {
    console.log("Answer created: " + answer);
  });
```

setRemoteDescription(desc)
-----------------------
Either when an offer or answer is received. It must be set as the remote
description.
For example:
```javascript
  driver.driverMethods.setRemoteDescription(description);
```

getLocalDesc()
----------------
Will return the local description. In case of the offeror, the offer will be
returned and vice versa.

getRemoteDesc()
----------------
Will return the remote description. In case of the offeror, the answer will be
returned and vice versa.

sendMessage(desc)
-----------------------
When the connection is established. You can send almost everything.
For example:
```javascript
  driver.driverMethods.setMessage("Hello World!");
```


getDescFromServer([callback])
-----------------------
This is a special non-official API for WebRTC. When an offer or answer is
created. It will be automatically stored on a server. Because this is
an asynchronous execution a callback can be passed to get informed when
the offer/answer is fully downloaded.
For example:
```javascript
  driver.driverMethods.getDescFromServer(function(offer) {
    console.log("Offer downloaded");
  });
```

* Connection established
------------------------
When a connection is successfully established. The device which is a priori passed to the
ScannerAPI.js API via "onDeviceAdded"-EventListener provides these sensors

onOpen([callback])
-----------------------
Will be invoked when the connection is established. An optional callback
can be passed.
For example:
```javascript
  device.sensors.onOpen(function(){
    console.log("Hello there! Now I can send something to other browser!");
  });
```

onMessage([callback])
-----------------------
Will be invoked when a message is received. An optional callback
can be passed.
For example:
```javascript
  device.sensors.onMessage(function(msg){
    console.log("Lets see what was sent! " + msg);
  });
```


Detail documentation of W3C:
------------------------------
Follow this link [WebRTC-Documentation](http://w3c.github.io/webrtc-pc/#interface-definition).


Known issues
--------------
When the offeror gets the answer and set it as his remote description.
According to the explanation above the connection between the two browsers
should be established. But sometimes it does not.
Solution: Reset (deleting browser data) and restart your browser.

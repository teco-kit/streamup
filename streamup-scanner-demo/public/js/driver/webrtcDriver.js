/*
* This driver should work as the easyble driver
* it must provide
* - services with eg. getAccelerometer etc....
* - startScan
* - stopScan
* - the startScan should
* - also important address (uuid) and name
*/

webrtcDriver = (function()
{
  // Main object which holds the
  var webrtcDriver = {};

  // Internal variable
  var internal = {};

  internal.localURL = "http://192.168.123.12/db";

  var RTCMultiSession = function(options) {
      return {
  	send: function (message) {
  	    if (moz && message.file)
  		data = message.file;
              else
  		data = JSON.stringify(message);

  	    activedc.send(data);
  	}
      }
  };

  // config and connection details

  //internal.cfg = {"iceServers":[{"url":"stun:23.21.150.121"}]};
  internal.cfg = {"iceServers":[{"url":"stun:stun.l.google.com:19302"}]};
  internal.con = { 'optional': [{'DtlsSrtpKeyAgreement': true}] };

  // For webrtcDriver we need to store the descriptions, both local and remote
  internal.localDesc;
  internal.compressedLocalDesc;
  internal.descURL;
  internal.remoteDesc;
  internal.compressedRemoteDesc;

  // webrtcDriver internal peer connection variable
  internal.pc;
  // datachannel
  internal.dc = null;
  internal.tn = null;
  // turn server
  internal.tn;

  internal.extWin;

  internal.activedc;
    var device = {};

  //Standard internal callback
  internal.stdCallback = function() {console.log("Standard-callback webrtcDriver executed");};

  //Standard internal fail callback
  internal.failCallback = function() { console.log("Fail callback webrtcDriver executed");};

  internal.initDataChannel = function() {
      try {
        internal.dc = internal.pc.createDataChannel('test', {reliable:true});
        internal.activedc = internal.dc;
        console.log("Created datachannel (pc1)");
        internal.dc.onopen = internal.onOpenCallback;
        internal.dc.onmessage = internal.onMessageCallback;
    } catch (e) { console.warn("No data channel (pc1)", e); }
  }

  webrtcDriver.startScan = function(win, fail) {
    internal.init();
    device.name = "webrtcDriver";
    device.rssi = -999;
    device.services = {};
    device.address = "webrtcDriver";

    // methoden für webrtcDriver müssen implementiert werden.
    device.services.createOffer = function(successCallback) {
        internal.initDataChannel();

        var success = function() {
          console.log("Offer successfully created.");
        }
        var fail = function() {
          console.log("Offer failed to create.");
        }
        successCallback = typeof successCallback == "function" ? successCallback : success;
        failCallback = typeof failCallback == "function" ? failCallback : fail;

        internal.pc.createOffer(function (desc) {
            internal.localDesc = desc;
            internal.pc.setLocalDescription(desc, function(des){console.log(desc);}, function(){console.log("Could not set local description.")});
            successCallback();
        }, failCallback);
      }

      device.services.sendMessage = function(msg) {
        if(msg) {
          internal.dc.send(msg);
        } else {
          console.log("Sending message error: Cannot send undefined value.");
        }
      }

      device.services.getLocalDesc = function() {
        return internal.getLocalDesc();
      }

      device.services.getRemoteDesc = function() {
        return internal.getLocalDesc();
      }

      /*device.services.getDescURL = function() {
        return internal.getDescURL();
      }*/

      device.services.onOpen = function(callback) {
        internal.onOpenCallback = callback;
      }

      device.services.onMessage = function(callback) {
        internal.onMessageCallback = function(e){callback(e.data);};
      }

      device.services.getDescFromServer = function(callback) {
        internal.getDescFromServer(callback);
      }


      device.services.setRemoteDescription = function(desc){
        desc = new RTCSessionDescription(JSON.parse(desc));

        internal.pc.setRemoteDescription(desc);
      }

    device.services.createAnswer = function(offerDesc) {
      internal.createAnswer(offerDesc);
    }

    /*device.services.onConnection = function(callback) {
      internal.pc.onconnection = callback;
    }*/


    internal.extWin = win;
    win(device);
  }

  internal.createAnswer = function(offerDesc, callback) {
    offerDesc = JSON.parse(offerDesc);
    internal.pc.ondatachannel = internal.receiverDC;
    //offerDesc = internal.decompressDesc(offerDesc);
    offerDesc = new RTCSessionDescription(offerDesc);
    internal.pc.setRemoteDescription(offerDesc);
    internal.pc.createAnswer(function (answerDesc) {

    console.log("Created local answer: ", answerDesc);
    internal.pc.setLocalDescription(answerDesc);
    if(callback && typeof callback == "function") {
      internal.iceCandidateCallback = callback;
    }

    }, function () { console.warn("No create answer"); });

  }

  // this variable holds a given callback when either the offer or answer is created.
  // in waiting for the iceCandidates.
  internal.iceCandidateCallback = function(desc) {
    if(desc && desc.type) {
      console.log(desc.type + " was created: " + desc);
    }
  }

  internal.compressDesc = function(desc) {
    //Nach dem diff zu urteil gibt ein paar Stellen.
    //desc = JSON.parse(desc);
    var type = desc.type;


    desc = JSON.stringify(desc);
    var firstSearch = "no=- ";
    var firstBegin = desc.indexOf(firstSearch);
    var firstEnd = desc.indexOf("\\r\\ns=-\\r\\nt=0 ");
    var first = desc.substring(firstBegin + firstSearch.length, firstEnd);
    console.log(first);

    var secondSearch = "nm=application ";
    var secondBegin = desc.indexOf(secondSearch);
    var secondEnd = desc.indexOf("DTLS");
    var second = desc.substring(secondBegin + secondSearch.length, secondEnd);
    console.log(second);

    var thirdSearch = "nc=IN IP4 ";
    var thirdBegin = desc.indexOf(thirdSearch);
    var thirdEnd = desc.indexOf("\\r\\na=candidate");
    var third = desc.substring(thirdBegin + thirdSearch.length, thirdEnd);
    console.log(third);

    var fourthSearch = "\\r\\na=candidate:";
    var fourthBegin = desc.indexOf(fourthSearch);
    var fourthEnd = desc.indexOf("typ host generation");
    var fourth = desc.substring(fourthBegin + fourthSearch.length, fourthEnd);
    console.log(fourth);


    var fifthSearch = "typ host generation 0\\r\\na=candidate:";
    var fifthBegin = desc.indexOf(fifthSearch);
    var fifthEnd = desc.indexOf(" typ host tcptype active generation");
    var fifth = desc.substring(fifthBegin + fifthSearch.length, fifthEnd);
    console.log(fifth);

    var sixthSearch = "na=ice-ufrag:";
    var sixthBegin = desc.indexOf(sixthSearch);
    var sixthEnd = desc.indexOf("\\r\\na=mid:data");
    var sixth = desc.substring(sixthBegin + sixthSearch.length, sixthEnd);
    console.log(sixth);

    return {type:type, first:first, second:second, third:third, fourth:fourth, fifth:fifth, sixth:sixth};
  }

  internal.decompressDesc = function(desc) {

    desc = JSON.parse(desc);
    var desc1 =   "{\"type\":\"" + desc.type + "\",\"sdp\":\"v=0\\r\\no=- " + desc.first +"\\r\\ns=-\\r\\nt=0 0\\r\\na=msid-semantic: WMS\\r\\nm=application "+ desc.second + "DTLS/SCTP 5000\\r\\nc=IN IP4 " + desc.third + "\\r\\na=candidate:" + desc.fourth + "typ host generation 0\\r\\na=candidate:";
    var desc2 = desc.fifth + " typ host tcptype active generation 0\\r\\na=ice-ufrag:"  + desc.sixth + "\\r\\na=mid:data\\r\\na=sctpmap:5000 webrtc-datachannel 1024\\r\\n\"}"

    return JSON.parse(desc1+desc2);
  }


  internal.receiverDC = function (e) {
      var datachannel = e.channel || e; // Chrome sends event, FF sends raw channel
      console.log("Received datachannel (pc2)", arguments);
      internal.dc = datachannel;
      internal.dc.onopen = internal.onOpenCallback;
      internal.dc.onmessage = internal.onMessageCallback;
  }

  internal.onOpenCallback = function (e) {
      console.log('data channel connected' + e);
  }
  internal.onMessageCallback = function (e) {
      console.log("Got message (pc2)", e.data);
  };


 internal.handleOnconnection = function() {
     console.log("Datachannel connected");
 }


  internal.onsignalingstatechange = function(state) {
     console.info('signaling state change:', state);
 }

  internal.oniceconnectionstatechange = function(state) {
     console.info('ice connection state change:', state);
 }

 internal.onicegatheringstatechange = function(state) {
     console.info('ice gathering state change:', state);
 }

 internal.setRemoteDescription = function(desc) {
   desc = new RTCSessionDescription(desc);
   if(typeof desc == "object" && desc) {
     internal.pc.setRemoteDescription(desc);

   } else {
     try{
       desc = JSON.encode(desc);
       if(typeof desc == "object" && desc) {
         internal.pc.setRemoteDescription(desc);
       } else {
         console.log("Remote description not set.");
       }
     } catch(e) {
       console.log("Problem with encoding the remote description to set it");
     }

   }
 }



  internal.init = function(){
    internal.pc = new RTCPeerConnection(internal.cfg, internal.con);

    internal.pc.onicecandidate = function (e) {
          console.log("ICE candidate (pc1)", e);
          if (e.candidate == null) {
              internal.iceCandidateCallback(internal.pc.localDescription);
              internal.putToDocker(JSON.stringify(internal.pc.localDescription));
              internal.localDesc = internal.pc.localDescription;
          }
      };

      if(!internal.pc.onconnection) {
        internal.pc.onconnection = internal.handleOnconnection;
      }

     internal.pc.onsignalingstatechange = internal.onsignalingstatechange;
     internal.pc.oniceconnectionstatechange = internal.oniceconnectionstatechange;
     internal.pc.onicegatheringstatechange = internal.onicegatheringstatechange;
  }

  internal.getDescFromServer = function(callback) {
    var url = url ? url : internal.localURL;

    callback = typeof callback == "function" ? callback : function() {console.log("Getting description success.");}

    $.ajax({
      url: internal.localURL,
      type: 'GET',
      success: function(e) { callback(e.node.value); }
    });
  }



  internal.putToDocker = function(desc) {
    $.ajax({
    url: internal.localURL,
    type: 'PUT',
    data: 'value='+desc,
    success: function() { console.log('Descripton put to docker'); }
});

  }

  internal.getLocalDesc = function() {
    //return internal.compressedLocalDesc;
    return internal.localDesc;
  }

  internal.getRemoteDesc = function() {
    return internal.remoteDesc;
  }

  internal.getDescURL = function() {
    return internal.localURL;
  }


  webrtcDriver.stopScan = function() {

  }


  return webrtcDriver;
})();

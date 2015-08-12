/*
 * Run this in a Firefox "Scratchpad" (Tools > Web Developer > Scratchpad)
 * With Cmd-R to simulate an orientation event in the current page
 */

function simulateOrientation(alpha, beta, gamma) {
  var event = document.createEvent("DeviceOrientationEvent");
  event.initDeviceOrientationEvent('deviceorientation',
       true, true, alpha, beta, gamma, true);

  window.dispatchEvent(event);
}

function simulateAcceleration(x, y, z) {
  var event = document.createEvent("DeviceMotionEvent");
  event.initDeviceMotionEvent('devicemotion',
                              true, true, { x:x, y:y, z:z}, { x:x, y:y, z:z}, { x:x, y:y, z:z}, 10.0);  
  window.dispatchEvent(event);
}

function simulateAccelaration(x, y, z) {
  var event = document.createEvent("Event");
  event.initEvent('devicemotion', true, true);
  event.acceleration = { x:x, y:y, z:z};  
  window.dispatchEvent(event);
}

function simulateAccelerationIncludingGravity(x, y, z) {
  var event = document.createEvent("Event");
  event.initEvent('devicemotion', true, true);
  event.accelerationIncludingGravity = { x:x, y:y, z:z};  
  window.dispatchEvent(event);
}


function simulateRotationRate(alpha, beta, gamma) {
  var event = document.createEvent("Event");
  event.initEvent('devicemotion', true, true);
  event.rotationRate = { alpha: alpha, beta: beta, gamma: gamma};
  window.dispatchEvent(event);
}

function simulateDeviceMotion(acc, rot, accGrav) {
  var event = document.createEvent("Event");
  event.initEvent('devicemotion', true, true);
  event.acceleration = acc;
  event.rotationRate = rot;
  event.accelerationIncludingGravity = accGrav;  
  window.dispatchEvent(event);
}

//simulateOrientation(111, -30, 60);
simulateDeviceMotion({x:11, y:52, z:53}, {alpha:54, beta:55, gamma:56}, {x:57, y:58, z:59});

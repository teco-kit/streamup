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

simulateOrientation(111, -30, 60);
simulateAcceleration(0.1,0.1,0.1);

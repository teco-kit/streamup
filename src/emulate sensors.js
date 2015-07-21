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

simulateOrientation(111, -30, 60);
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

function simulateDeviceMotion(acc, accGrav, rot) {
  var event = document.createEvent("Event");
  event.initEvent('devicemotion', true, true);
  event.acceleration = acc;
  event.rotationRate = rot;
  event.accelerationIncludingGravity = accGrav;  
  window.dispatchEvent(event);
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomAccelaration() {
  return   {
    x : getRandomArbitrary(0,20),
    y : getRandomArbitrary(0,20),
    z : getRandomArbitrary(0,20)
  }
}

function getRandomAccelarationWithGravitiy() {
  return {
    x : getRandomArbitrary(0,20),
    y : getRandomArbitrary(0,20),
    z : getRandomArbitrary(0,20)
  }
}

function getRandomRotationRate() {
  return {
    alpha : getRandomArbitrary(0,360),
    beta : getRandomArbitrary(-180,180),
    gamma : getRandomArbitrary(-90,90)
  }
}

//simulateOrientation(111, -30, 60);
simulateDeviceMotion(getRandomAccelaration(),getRandomAccelarationWithGravitiy(), getRandomRotationRate());
//simulateDeviceMotion({x:11, y:52, z:53}, {alpha:54, beta:55, gamma:56}, {x:57, y:58, z:59});

/*
Exception: SyntaxError: missing ; before statement
@Scratchpad/1:60
*/
/*
Exception: SyntaxError: missing ; before statement
@Scratchpad/1:60
*/
/*
Exception: SyntaxError: missing ; before statement
@Scratchpad/1:60
*/
/*
Exception: SyntaxError: missing ; before statement
@Scratchpad/1:68
*/
/*
Exception: SyntaxError: missing ; before statement
@Scratchpad/1:76
*/
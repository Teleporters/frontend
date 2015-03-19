'use strict';

var THREE = require('three');

/**
* The base class for all VR devices.
*/
function VRDevice() {
  this.hardwareUnitId = 'polyfill';
}

/**
* The base class for all VR HMD devices.
*/
function HMDVRDevice() {
}
HMDVRDevice.prototype = new VRDevice();

/**
* The base class for all VR position sensor devices.
*/
function PositionSensorVRDevice() {
}
PositionSensorVRDevice.prototype = new VRDevice();

// cardboard

// Constants from vrtoolkit: https://github.com/googlesamples/cardboard-java.
var INTERPUPILLARY_DISTANCE = 0.06;
var DEFAULT_MAX_FOV_LEFT_RIGHT = 40;
var DEFAULT_MAX_FOV_BOTTOM = 40;
var DEFAULT_MAX_FOV_TOP = 40;

/**
* The HMD itself, providing rendering parameters.
*/
function CardboardHMDVRDevice() {
  // Set display constants.
  this.eyeTranslationLeft = {
    x: INTERPUPILLARY_DISTANCE * -0.5,
    y: 0,
    z: 0
  };
  this.eyeTranslationRight = {
    x: INTERPUPILLARY_DISTANCE * 0.5,
    y: 0,
    z: 0
  };

  // From com/google/vrtoolkit/cardboard/FieldOfView.java.
  this.recommendedFOV = {
    upDegrees: DEFAULT_MAX_FOV_TOP,
    downDegrees: DEFAULT_MAX_FOV_BOTTOM,
    leftDegrees: DEFAULT_MAX_FOV_LEFT_RIGHT,
    rightDegrees: DEFAULT_MAX_FOV_LEFT_RIGHT
  };
}
CardboardHMDVRDevice.prototype = new HMDVRDevice();

CardboardHMDVRDevice.prototype.getRecommendedEyeFieldOfView = function(whichEye) {
  return this.recommendedFOV;
};

CardboardHMDVRDevice.prototype.getEyeTranslation = function(whichEye) {
  if (whichEye == 'left') {
    return this.eyeTranslationLeft;
  }
  if (whichEye == 'right') {
    return this.eyeTranslationRight;
  }
};

// GyroSensor

/**
* The positional sensor, implemented using web DeviceOrientation APIs.
*/
function GyroPositionSensorVRDevice() {
  // Subscribe to deviceorientation events.
  window.addEventListener('deviceorientation', this.onDeviceOrientationChange.bind(this));
  window.addEventListener('orientationchange', this.onScreenOrientationChange.bind(this));
  this.deviceOrientation = null;
  this.screenOrientation = window.orientation;

  // Helper objects for calculating orientation.
  this.finalQuaternion = new THREE.Quaternion();
  this.deviceEuler = new THREE.Euler();
  this.screenTransform = new THREE.Quaternion();
  // -PI/2 around the x-axis.
  this.worldTransform = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
}
GyroPositionSensorVRDevice.prototype = new PositionSensorVRDevice();

/**
* Returns {orientation: {x,y,z,w}, position: null}.
* Position is not supported since we can't do 6DOF.
*/
GyroPositionSensorVRDevice.prototype.getState = function() {
  return {
    orientation: this.getOrientation(),
    position: {x: 0, y: 0, z: 0}
  }
};

GyroPositionSensorVRDevice.prototype.onDeviceOrientationChange =
function(deviceOrientation) {
  this.deviceOrientation = deviceOrientation;
};

GyroPositionSensorVRDevice.prototype.onScreenOrientationChange =
function(screenOrientation) {
  this.screenOrientation = window.orientation;
};

GyroPositionSensorVRDevice.prototype.getOrientation = function() {
  if (this.deviceOrientation == null) {
    return null;
  }

  // Rotation around the z-axis.
  var alpha = THREE.Math.degToRad(this.deviceOrientation.alpha);
  // Front-to-back (in portrait) rotation (x-axis).
  var beta = THREE.Math.degToRad(this.deviceOrientation.beta);
  // Left to right (in portrait) rotation (y-axis).
  var gamma = THREE.Math.degToRad(this.deviceOrientation.gamma);
  var orient = THREE.Math.degToRad(this.screenOrientation);

  // Use three.js to convert to quaternion. Lifted from
  // https://github.com/richtr/threeVR/blob/master/js/DeviceOrientationController.js
  this.deviceEuler.set(beta, alpha, -gamma, 'YXZ');
  this.finalQuaternion.setFromEuler(this.deviceEuler);
  this.minusHalfAngle = -orient / 2;
  this.screenTransform.set(0, Math.sin(this.minusHalfAngle), 0, Math.cos(this.minusHalfAngle));
  this.finalQuaternion.multiply(this.screenTransform);
  this.finalQuaternion.multiply(this.worldTransform);

  return this.finalQuaternion;
};

// The polyfill

function WebVRPolyfill() {
  this.devices = [];

  // Feature detect for existing WebVR API.
  if ('getVRDevices' in navigator) {
    return;
  }

  // Initialize our virtual VR devices.
  if (this.isCardboardCompatible()) {
    this.devices.push(new CardboardHMDVRDevice());
  }

  // Polyfill using the right position sensor.
  if (this.isMobile()) {
    this.devices.push(new GyroPositionSensorVRDevice());
  }

  // Provide navigator.getVRDevices.
  navigator.getVRDevices = this.getVRDevices.bind(this);

  // Provide the CardboardHMDVRDevice and PositionSensorVRDevice objects.
  window.HMDVRDevice = HMDVRDevice;
  window.PositionSensorVRDevice = PositionSensorVRDevice;
}

WebVRPolyfill.prototype.getVRDevices = function() {
  var devices = this.devices;
  return new Promise(function(resolve, reject) {
    try {
      resolve(devices);
    } catch (e) {
      reject(e);
    }
  });
};

/**
* Determine if a device is mobile.
*/
WebVRPolyfill.prototype.isMobile = function() {
  return /Android/i.test(navigator.userAgent) ||
  /iPhone|iPad|iPod/i.test(navigator.userAgent);;
};

WebVRPolyfill.prototype.isCardboardCompatible = function() {
  // For now, support all iOS and Android devices.
  return this.isMobile();
};

module.exports = function() { return new WebVRPolyfill(); };

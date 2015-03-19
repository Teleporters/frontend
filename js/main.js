var World = require('three-world'),
    THREE = require('three'),
    WebVRManager = require('./vendor/webvr-manager'),
    VREffect = require('./vendor/VREffect'),
    VRControls = require('./vendor/VRControls'),
    WebVRPolyfill = require('./vendor/new-webvr-polyfill');

var isWebGLAvailable = (function() {
  try {
    var canvas = document.createElement("canvas");
    return !! window.WebGLRenderingContext
                    && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch(e) {
    return false;
  }
})();

new WebVRPolyfill();

var onRender = function() {

  controls.update();

  if (vrmgr.isVRMode()) {
    effect.render(World.getScene(), cam);
    return false;
  }

  return true;
}

var textures = {
  zurich_1: THREE.ImageUtils.loadTexture("imgs/zurich_1.jpg"),
  zurich_2: THREE.ImageUtils.loadTexture("imgs/zurich_2.jpg"),
  zurich_3: THREE.ImageUtils.loadTexture("imgs/zurich_3.jpg")
};

var material = new THREE.MeshBasicMaterial({wireframe: false, side: THREE.BackSide}),
    skydome  = new THREE.Mesh(new THREE.SphereGeometry(100, 64, 64), material),
    cam      = null,
    controls = null,
    vrmgr    = null,
    effect   = null;

if(isWebGLAvailable) {
  window.addEventListener("hashchange", function() {
    if(window.location.hash.slice(1,5) == "show") {
      start(window.location.hash.slice(6));
    }
  });

  if(window.location.hash.slice(1,5) == "show") {
    start(window.location.hash.slice(6));
  }
} else {
  document.getElementById("fallback").style.display = "block";
}

function start(img) {
  var startScreen = document.querySelector("article");
  startScreen.parentNode.removeChild(startScreen);

  document.querySelector("a.back").style.display = "inline";

  material.map = textures[img];
  material.needsUpdate = true;
  World.init({
    camDistance: 0,
    renderCallback: onRender,
    rendererOpts: {antialias: true}
  });

  effect = new VREffect(World.getRenderer());
  effect.setSize(window.innerWidth, window.innerHeight);

  vrmgr = new WebVRManager(effect);

  cam = World.getCamera();
  controls = new VRControls(cam);

  skydome.position.copy(cam.position);

  World.add(skydome);
  World.start();
}

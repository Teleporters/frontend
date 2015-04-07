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

// Allow cross-origin texture loading
THREE.ImageUtils.crossOrigin = '';

var material = new THREE.MeshBasicMaterial({wireframe: false, side: THREE.BackSide}),
    skydome  = new THREE.Mesh(new THREE.SphereGeometry(100, 64, 64), material),
    cam      = null,
    controls = null,
    vrmgr    = null,
    effect   = null;

if(isWebGLAvailable) {
  window.addEventListener("hashchange", function() {
    if(window.location.hash.slice(1,5) == "show") {
      document.getElementById("loading").style.display = "inline-block";
      start(window.location.hash.slice(6));
    }
  });

  if(window.location.hash.slice(1,5) == "show") {
    document.getElementById("loading").style.display = "inline-block";
    start(window.location.hash.slice(6));
  }
} else {
  document.getElementById("fallback").style.display = "block";
}

var dropzone = document.getElementById("spot_img");

function handleDragHover(e) {
	e.stopPropagation();
	e.preventDefault();

	e.target.className = (e.type == "dragover" ? "dropzone dropzone-hover" : "dropzone");
}

function stop(e) {
  e.preventDefault();
  e.stopPropagation();

  var canvas = document.querySelector("canvas");
  canvas.parentNode.removeChild(canvas);
  document.querySelector(".back").style.display = "none";
  document.querySelector("article").style.display = "block";

  return false;
}

function handleUpload(e) {
//  document.getElementById("dropzone").style.display = "none";
  document.getElementById("loading").style.display = "inline-block";
	e.stopPropagation();
	e.preventDefault();

  var files = e.target.files;
  if(files.length < 1) return;

  var reader = new FileReader();
  reader.readAsDataURL(files[0]);
  reader.onload = function(e) {
    var img = new Image();
    img.src = e.target.result;
    img.onload = function() {
      start(img);
    }
  }
}

if(dropzone) {
  dropzone.addEventListener("dragover", handleDragHover, false);
  dropzone.addEventListener("dragleave", handleDragHover, false);
}
if(document.getElementById("spot_img")) {
  document.getElementById("spot_img").addEventListener("change", handleUpload, false);
}

if(document.querySelector(".back")) {
  document.querySelector(".back").addEventListener("click", stop, false);
}

function start(img) {
  document.querySelector(".back").style.display = "inline";

  if((typeof img) === "string") material.map = THREE.ImageUtils.loadTexture("https://res.cloudinary.com/geekonaut/image/upload/spots/" + img + ".jpg");
  else {
    var tex = new THREE.Texture();
    tex.image = img;
    tex.sourceFile = "upload.jpg";
    tex.needsUpdate = true;
    material.map = tex;
  }
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

  document.getElementById("loading").style.display = "none";
  var startScreen = document.querySelector("article");
  startScreen.style.display = "none";
}

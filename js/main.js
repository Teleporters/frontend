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

  if (vrmgr.isVRMode()) {
    controls.update();
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


window.location.search.split("&").forEach(function(p) {
  var parts = p.split("=");

  if(parts[0] == "public_id") {
    var slug = decodeURIComponent(parts[1]);
    window.location.hash = "#show=" + slug.replace("spots/", "");
    var shareLink = window.location.origin + window.location.pathname + "#show=" + slug.replace("spots/", "");
    document.getElementById("share_link").value = shareLink;
    window.sharing = true;

    var clip = new ZeroClipboard(document.querySelectorAll("#copy_share_link"));

    clip.addEventListener('mousedown',function() {
    	clip.setText(shareLink);
    });

    clip.addEventListener('complete',function(client,text) {
      document.getElementById('copy_share_link').disabled = true;
      document.getElementById('copy_share_link').textContent = "Copied!";
    });
  }
});

if(isWebGLAvailable) {

  World.init({
    camDistance: 0,
    renderCallback: onRender,
    rendererOpts: {antialias: true}
  });

  effect = new VREffect(World.getRenderer());
  effect.setSize(window.innerWidth, window.innerHeight);

  vrmgr = new WebVRManager(effect, {hideButton: true});
  cam = World.getCamera();
  cam.rotation.order = 'YXZ';
  controls = new VRControls(cam);

  skydome.position.copy(cam.position);
  cam.rotation.set(0, 0, 0);

  World.add(skydome);
  World.start();

  var hammertime = new Hammer(World.getRenderer().domElement, {});

  hammertime.on('pan', function(e) {
    var turnY = Math.PI * 0.01 * (e.deltaX / window.innerWidth),
        turnX = Math.PI * 0.01 * (e.deltaY / window.innerHeight);

    cam.rotation.y += turnY;
    cam.rotation.x += turnX;

    e.preventDefault();
    e.stopPropagation();
    return false;
  });

  World.getRenderer().domElement.addEventListener('touchstart', function(e) { e.preventDefault(); }, true);

  window.addEventListener("hashchange", function() {
    if(window.location.hash.slice(1,5) == "show") {
      document.getElementById("loading").style.display = "inline-block";
      start(window.location.hash.slice(6));
    }
  });

  if(window.location.hash.slice(1,5) == "show") {
    document.getElementById("loading").style.display = "inline-block";
    start(window.location.hash.slice(6));
    if(window.sharing) window.location.hash = "#share";
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

  document.querySelector("nav").style.display = "none";
  document.querySelector("article").style.display = "block";
  document.querySelector("canvas").style.display = "none";
  document.getElementById("publish").style.display = "none";
  vrmgr.hideButton = true;
  vrmgr.vrButton.style.display = "none";
  return false;
}

function handleUpload(e) {
  document.getElementById("submit").style.display = "inline-block";
  document.getElementById("loading").style.display = "block";
  document.getElementById("publish").style.display = "inline";
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

if(document.getElementById("publish")) {
  document.getElementById("publish").addEventListener("click", function(e) {
    if(document.getElementById("spot_img").files.length != 1) return;
    document.forms[0].submit();
  })
}

document.getElementById("callback").value = window.location.href;

function start(img) {
  document.querySelector("nav").style.display = "inline";

  if((typeof img) === "string") material.map = THREE.ImageUtils.loadTexture("https://res.cloudinary.com/geekonaut/image/upload/a_hflip/spots/" + img + ".jpg");
  else {
    var tex = new THREE.Texture();
    tex.image = img;
    tex.sourceFile = "upload.jpg";
    tex.needsUpdate = true;
    material.map = tex;
  }
  material.needsUpdate = true;

  document.getElementById("loading").style.display = "none";
  var startScreen = document.querySelector("article");
  startScreen.style.display = "none";
  document.querySelector("canvas").style.display = "block";
  vrmgr.hideButton = false;
  vrmgr.vrButton.style.display = "block";
}

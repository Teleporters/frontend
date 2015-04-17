var World = require('three-world'),
    THREE = require('three'),
    WebVRManager = require('./vendor/webvr-manager'),
    VREffect = require('./vendor/VREffect'),
    VRControls = require('./vendor/VRControls'),
    WebVRPolyfill = require('./vendor/new-webvr-polyfill');
if(typeof Keen !== "undefined") {
  var keen = new Keen({
    projectId: "5524d0fe46f9a729f32a51ab",
    writeKey: "4de50dbca92183ab6494f69b0376b8e68aa71611009f206ff921d962856cfcba43b101aa445f1769f44d5ef0eed55e24901fff2dbaf3b9457f82e2090227354ab40525a8630a2320dbd8b165d4ab8a08c53451d00b64663cfdd9d27e36d1c95e6352897d3a3002d41bccddf03c5836fb"
  });
}

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
  } else if(vrmgr.mode === 1) { // incompatible to WebVR
    controls.update();
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

//
// Querystring handling
//

window.location.search.split("&").forEach(function(p) {
  var parts = p.split("=");

  if(parts[0].replace("?", "") == "public_id") {
    var slug = decodeURIComponent(parts[1]);
    window.location.hash = "#show=" + slug.replace("/", "");
    var shareLink = window.location.origin + window.location.pathname + "#show=" + slug.replace("spots/", "");
    document.getElementById("share_link").value = shareLink;
    var shareButtons = document.querySelectorAll(".st");
    for(var i=0; i<shareButtons.length;i++) {
      shareButtons[i].setAttribute("st_url", shareLink);
      shareButtons[i].setAttribute("st_title", "Check out this teleport I made!");
      shareButtons[i].setAttribute("st_summary", "Check out this teleport I made!");
    };
    stLight.options({publisher: "81197603-e22b-4944-9e98-d0fedc2573af", doNotHash: false, doNotCopy: false, hashAddressBar: false});

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

// WebGL init & all related setup

if(isWebGLAvailable) {
  if(typeof ga !== "undefined") ga('set', 'dimension1', 'Yes');
  if(typeof keen !== "undefined") keen.addEvent("webgl", {supported: 'Yes'});

  World.init({
    camDistance: 0,
    renderCallback: onRender,
    rendererOpts: {antialias: true}
  });

  effect = new VREffect(World.getRenderer());
  effect.setSize(window.innerWidth, window.innerHeight);

  vrmgr = new WebVRManager(effect, {hideButton: true});
  vrmgr.vrButton.style.zIndex = 35;
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
  if(window.location.hash.slice(1,5) == "show") {
    var imgName = window.location.hash.slice(6);
    window.location.hash = '#fallback';
    document.getElementById("fallback_img").src = "http://teleports.s3-website-eu-west-1.amazonaws.com/portals/" + imgName + ".jpg";
  }
  if(typeof ga !== "undefined") ga('set', 'dimension1', 'No');
  if(typeof keen !== "undefined") keen.addEvent("webgl", {supported: 'No'});
}

//
// Drag & Drop
//

var dropzone = document.getElementById("spot_img");

function handleDragHover(e) {
	e.stopPropagation();
	e.preventDefault();

	e.target.parentNode.className = (e.type == "dragover" ? "dropzone dropzone-hover" : "dropzone");
}

//
// Uploads
//

function handleUpload(e) {
  if(document.getElementById("submit_button")) document.getElementById("submit_button").style.display = "inline-block";
  document.getElementById("upload_loading").style.display = "block";
  if(document.getElementById("publish")) document.getElementById("publish").style.display = "inline";
	e.stopPropagation();
	e.preventDefault();

  var files = e.target.files;
  if(files.length < 1) return;
  setTimeout(function() {
    var reader = new FileReader();
    reader.readAsDataURL(files[0]);
    reader.onload = function(e) {
      var img = new Image();
      img.src = e.target.result;
      img.onload = function() {
        start(img);
      }
      if(document.getElementById("preview")) document.getElementById("preview").src = e.target.result;
      document.getElementById("upload_loading").style.display = "none";
    }
  }, 100);
}

//
// Event handlers
//

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
    document.getElementById("upload_form").submit();
  })
}

if(document.getElementById("inquiry_submit")) {
  document.getElementById("inquiry_submit").addEventListener("click", function(e) {
    e.preventDefault();

    var email = document.querySelector("input[name='email']").value;
    if(email == "" || email.indexOf("@") === false) {
      alert("Please enter your email address");
    }

    var xhr = new XMLHttpRequest();
    var params = "email=" + email;
    var notification = document.getElementById("inquiry_result");
    xhr.open('post', 'http://api.teleports.me/inquiry');
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("Content-length", params.length);
    xhr.setRequestHeader("Connection", "close");

    xhr.onload = function() {
      try {
        var response = JSON.parse(this.responseText);
        if(response.result == "OK") {
          notification.textContent = "We have received your inquiry and will come back to you soon. Thank you!";
          notification.className="notification success";
        } else {
          notification.innerHTML = "Whoops! That didn't work... <a href=\"mailto:hello@teleports.me?subject=Inquiry\">Please click here to try again</a>";
          notification.className="notification error";
        }
      } catch(e) {
        console.error(e);
        notification.innerHTML = "Whoops! Your server has a hiccup. <a href=\"mailto:hello@teleports.me?subject=Inquiry\">Please click here to try again</a>";
        notification.className = "notification error";
      }
    }

    xhr.onerror = function() {
      notification.innerHTML = "Whoops! Your server has a hiccup. <a href=\"mailto:hello@teleports.me?subject=Inquiry\">Please click here to try again</a>";
      notification.className = "notification error";
    }

    xhr.send(params);

    return false;
  }, false);
}

//
// 3D Teleport stuff
//

function start(img) {
  window.scrollTo( 0, 0 );
  if(document.querySelector("#mininav")) document.querySelector("#mininav").style.display = "inline";
  if(document.querySelector("canvas")) document.querySelector("canvas").style.display = "block";

  if((typeof img) === "string") material.map = THREE.ImageUtils.loadTexture("http://teleports.s3-website-eu-west-1.amazonaws.com/portals/" + img + ".jpg");
  else {
    var tex = new THREE.Texture();
    tex.image = img;
    tex.sourceFile = "upload.jpg";
    tex.needsUpdate = true;
    material.map = tex;
  }
  material.needsUpdate = true;

  document.getElementById("loading").style.display = "none";
  vrmgr.hideButton = false;
  vrmgr.vrButton.style.display = "block";
}

function stop(e) {
  e.preventDefault();
  e.stopPropagation();

  if(window.location.hash.slice(1,5) == "show") window.location.hash = "";
  document.querySelector("#mininav").style.display = "none";
  document.querySelector("canvas").style.display = "none";
  if(document.getElementById("publish")) document.getElementById("publish").style.display = "none";
  vrmgr.hideButton = true;
  vrmgr.vrButton.style.display = "none";
  return false;
}

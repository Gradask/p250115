import { basic, labels, mesh, tex } from "./shaders.js";
import glhelpers from "./glhelpers.js";
import { saucepan, popcorns, nameTags, mode, camera, target, bottomPlate } from "./client.js";
import TexRenderer from "./TexRenderer.js";
import MeshRenderer from "./MeshRenderer.js";
import Light from "./Light.js";
import BasicRenderer from "./BasicRenderer.js";
import LabelRenderer from "./LabelRenderer.js";

const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2", { alpha: true });
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.clearColor(...glhelpers.rgb(248, 202, 212), 1);
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

const basicProgram = glhelpers.createProgram(gl, basic.vs, basic.fs);
const basicRenderer = new BasicRenderer(gl, basicProgram, basic);

const texProgram = glhelpers.createProgram(gl, tex.vs, tex.fs);
const texRenderer = new TexRenderer(gl, texProgram, tex);

const labelsProgram = glhelpers.createProgram(gl, labels.vs, labels.fs);
const labelRenderer = new LabelRenderer(gl, labelsProgram, labels);

const meshProgram = glhelpers.createProgram(gl, mesh.vs, mesh.fs);
const meshRenderer = new MeshRenderer(gl, meshProgram, mesh);

//let fbReady = false;
const fb = {
  ready: false
};

let backgroundTexture = glhelpers.createBackgroundTexture(gl, canvas.width, canvas.height);
let depthBuffer = glhelpers.createDepthBuffer(gl, canvas.width, canvas.height);
let backgroundFbo = glhelpers.createBackgroundFbo(gl, backgroundTexture, depthBuffer);

function render() {
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(true);
  gl.disable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (mode === "distance" && target.isReady) basicRenderer.render(target);
  gl.enable(gl.CULL_FACE);
  if (bottomPlate.isReady) meshRenderer.render(bottomPlate);
  gl.enable(gl.DEPTH_TEST);
  if (saucepan.isReady) meshRenderer.render(saucepan);

  if (popcorns.all.length > 0) {
    if (bottomPlate.isReady && saucepan.isReady && !fb.ready) {
      renderBackgroundSnapshot();
      fb.ready = true;
    }
    gl.depthMask(false);
    texRenderer.render(popcorns);
    gl.disable(gl.DEPTH_TEST);
    labelRenderer.render(nameTags, backgroundTexture);
  }
  camera.isDirty = false;
}

function renderBackgroundSnapshot() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, backgroundFbo);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  if (mode === "distance" && target.isReady) basicRenderer.render(target);
  
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  if (bottomPlate.isReady) meshRenderer.render(bottomPlate);
  if (saucepan.isReady) meshRenderer.render(saucepan);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  camera.updateViewport();
  camera[mode]();
  camera.getMat();

  // Recreate fb
  backgroundTexture = glhelpers.createBackgroundTexture(gl, canvas.width, canvas.height);
  depthBuffer = glhelpers.createDepthBuffer(gl, canvas.width, canvas.height);
  backgroundFbo = glhelpers.createBackgroundFbo(gl, backgroundTexture, depthBuffer);

  fb.ready = false;
});

const light = new Light();

export { fb, render, gl, light, texRenderer };





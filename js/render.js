import { basic, mesh, tex } from "./shaders.js";
import glhelpers from "./glhelpers.js";
import { saucepan, popcorns, nameTags, mode, camera, target, bottomPlate } from "./client.js";
import TexRenderer from "./TexRenderer.js";
import MeshRenderer from "./MeshRenderer.js";
import Light from "./Light.js";
import BasicRenderer from "./BasicRenderer.js";

const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2', { alpha: true });
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.clearColor(0, 0, 0, 0.0);
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

const basicProgram = glhelpers.createProgram(gl,basic.vs, basic.fs);
const basicRenderer = new BasicRenderer(gl, basicProgram, basic); 

const texProgram = glhelpers.createProgram(gl, tex.vs, tex.fs);
const texRenderer = new TexRenderer(gl, texProgram, tex);

const meshProgram = glhelpers.createProgram(gl, mesh.vs, mesh.fs);
const meshRenderer = new MeshRenderer(gl, meshProgram, mesh);

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
    gl.depthMask(false);
    texRenderer.render(popcorns);
    gl.disable(gl.DEPTH_TEST);
    texRenderer.render(nameTags);
  }
  camera.isDirty = false;
}

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  camera.updateViewport();
  camera[mode]();
  camera.getMat();
});

const light = new Light();

export { render, gl, light, texRenderer };

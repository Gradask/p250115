import { camera } from "./client.js";
import glhelpers from "./glhelpers.js";
import mat4helpers from "./mat4helpers.js";
import { light } from "./render.js";

class MeshRenderer {
  constructor(gl, program, programInfo) {
    this.gl = gl;
    this.program = program;
    this.programInfo = programInfo;
    glhelpers.initAttribs(gl, this.program, this.programInfo.attribs);    
    glhelpers.initUniforms(gl, this.program, this.programInfo.uniforms);
  }

  render(drawInfo) {
    const gl = this.gl;
    gl.useProgram(this.program);

    glhelpers.setupBuffers(gl, this.programInfo.attribs, drawInfo);

    let mvMat = mat4helpers.multiply(camera.vMat, drawInfo.mMat);
    let mvpMat = mat4helpers.multiply(camera.pMat, mvMat);

    let inverseMvMat = mat4helpers.inverse(mvMat);
    let nMat = mat4helpers.transpose(inverseMvMat);
    const u_normalMatrix = [
      nMat[0], nMat[1], nMat[2],
      nMat[4], nMat[5], nMat[6],
      nMat[8], nMat[9], nMat[10]
    ]; 

    drawInfo.u_matrix = mvpMat;
    drawInfo.u_normalMatrix = u_normalMatrix;
    drawInfo.u_lightDirection = light.normalizedDir;

    glhelpers.setupUniforms(gl, this.programInfo.uniforms, drawInfo);
    glhelpers.setupIndices(gl, drawInfo);

    const count = drawInfo.indices.length;

    gl.drawElements(
      gl.TRIANGLES,
      count,
      gl.UNSIGNED_SHORT,
      0
    );
  }
}

export default MeshRenderer;
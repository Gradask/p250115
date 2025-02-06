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

    if (camera.isDirty || drawInfo.isDirty) {
      let mvMat = mat4helpers.multiply(camera.vMat, drawInfo.mMat);
      let mvpMat = mat4helpers.multiply(camera.pMat, mvMat);

      let inverseMvMat = mat4helpers.inverse(mvMat);
      let nMat = mat4helpers.transpose(inverseMvMat);
      drawInfo.u_normalMatrix = [
        nMat[0], nMat[1], nMat[2],
        nMat[4], nMat[5], nMat[6],
        nMat[8], nMat[9], nMat[10]
      ]; 

      drawInfo.u_matrix = mvpMat;
      drawInfo.u_lightDirection = light.normalizedDir;
      drawInfo.count = drawInfo.indices.length;
    }

    glhelpers.setupUniforms(gl, this.programInfo.uniforms, drawInfo);
    glhelpers.setupIndices(gl, drawInfo);

    gl.drawElements(
      gl.TRIANGLES,
      drawInfo.count,
      gl.UNSIGNED_SHORT,
      0
    );

    drawInfo.isDirty = false;
}

export default MeshRenderer;

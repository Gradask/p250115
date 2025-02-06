import { camera } from "./client.js";
import glhelpers from "./glhelpers.js";

class BasicRenderer {
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
      drawInfo.u_matrix = camera.vpMat;
      drawInfo.count = drawInfo.attribs.a_position.data.length/3;
    }
    
    glhelpers.setupUniforms(gl, this.programInfo.uniforms, drawInfo);
    
    gl.drawArrays(gl.TRIANGLES, 0, drawInfo.count);
    drawInfo.isDirty = false;
  }
}

export default BasicRenderer;

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
    drawInfo.u_matrix = camera.vpMat;
    glhelpers.setupUniforms(gl, this.programInfo.uniforms, drawInfo);

    const count = drawInfo.attribs.a_position.data.length/3;
    gl.drawArrays(gl.TRIANGLES, 0, count);
  }
}

export default BasicRenderer;
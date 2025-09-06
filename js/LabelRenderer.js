import { camera } from "./client.js";
import glhelpers from "./glhelpers.js";

class LabelRenderer {
  constructor(gl, program, programInfo) {
    this.gl = gl;
    this.program = program;
    this.programInfo = programInfo;
    glhelpers.initAttribs(gl, this.program, this.programInfo.attribs);    
    glhelpers.initUniforms(gl, this.program, this.programInfo.uniforms);
  }

  render(drawInfo, backgroundTexture) {
    const gl = this.gl;
    gl.useProgram(this.program);

    glhelpers.setupBuffers(gl, this.programInfo.attribs, drawInfo)

    if (camera.isDirty || drawInfo.isDirty) {
      drawInfo.u_matrix = camera.vpMat;
      if (!drawInfo.u_resolution) drawInfo.u_resolution = [];
      drawInfo.u_resolution[0] = camera.width
      drawInfo.u_resolution[1] = camera.height;
    }

    drawInfo.u_background = 4;  
    gl.activeTexture(gl.TEXTURE4); // use unit 1 (atlas is unit 0)
    gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);

    glhelpers.setupUniforms(gl, this.programInfo.uniforms, drawInfo);

    gl.drawArrays(gl.POINTS, 0, drawInfo.count);
    drawInfo.isDirty = false;
  }
}

export default LabelRenderer;

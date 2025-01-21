import { camera } from "./client.js";
import glhelpers from "./glhelpers.js";

class TexRenderer {
  constructor(gl, program, programInfo) {
    this.gl = gl;
    this.program = program;
    this.programInfo = programInfo;
    glhelpers.initAttribs(gl, this.program, this.programInfo.attribs);    
    glhelpers.initUniforms(gl, this.program, this.programInfo.uniforms);
    this.setupTextures(gl);
  }

  async setupTextures(gl) {
    let tex1 = await glhelpers.setupTexture(gl, "img/popcorn.png", {
      TEXTURE_WRAP_S: "CLAMP_TO_EDGE",
      TEXTURE_WRAP_T: "CLAMP_TO_EDGE",
      TEXTURE_MIN_FILTER: "NEAREST",
      TEXTURE_MAG_FILTER: "NEAREST"
    });
    let tex2 = await glhelpers.setupTexture(gl, "p250115/img/font.png");
    let tex3 = await glhelpers.setupTexture(gl, "p250115/mesh/Map__45_Normal_Bump.png");
  
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex1);
  
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tex2);
  
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, tex3);
    this.isReady = true;
  }

  render(drawInfo) {
    const gl = this.gl;
    gl.useProgram(this.program);

    glhelpers.setupBuffers(gl, this.programInfo.attribs, drawInfo)

    drawInfo.u_matrix = camera.vpMat;
    drawInfo.u_resolution = [camera.width, camera.height];
    glhelpers.setupUniforms(gl, this.programInfo.uniforms, drawInfo);

    gl.drawArrays(gl.POINTS, 0, drawInfo.count);
  }
}

export default TexRenderer;

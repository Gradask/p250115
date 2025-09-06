const glhelpers = {
  createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  },
  createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  },
  initAttribs(gl, program, attribInfos) {
    this.getLocations(gl, program, attribInfos, "getAttribLocation");
  },
  initUniforms(gl, program, uniformInfos) {
    this.getLocations(gl, program, uniformInfos, "getUniformLocation");
  },
  getLocations(gl, program, infos, method) {
    for (const id in infos) infos[id].loc = gl[method](program, id);
  },
  setupBuffers(gl, attribInfos, drawInfo) {
  for (const attribId in drawInfo.attribs) {
    const attrib = drawInfo.attribs[attribId];
    const info = attribInfos[attribId];

    if (!attrib.buffer) attrib.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, attrib.buffer);

    if (attrib.isDirty) {
      gl.bufferData(gl.ARRAY_BUFFER, attrib.data, gl.STATIC_DRAW);
      attrib.isDirty = false;
    }

    gl.enableVertexAttribArray(info.loc);
    gl.vertexAttribPointer(
      info.loc,
      info.size, 
      gl[info.type],
      info.normalize,
      0, // stride
      0 // offset
    ); 
  }
},
setupUniforms(gl, uniformInfos, drawInfo) {
  const keys = Object.keys(uniformInfos);
  for (let i = 0; i < keys.length; i++) {
    const id = keys[i];
    const info = uniformInfos[id];
    if (info.args) {
      gl[info.method](info.loc, false, drawInfo[id]); // hardcoded false is OK in this particular project
    } else {
      gl[info.method](info.loc, drawInfo[id]);
    }
  }
},
  async setupTexture(gl, url, params = {}) {
    const tex = this.createTexture(gl, params);
    await this.loadImage(gl, tex, url);
    return tex;
  },
  createTexture(gl, params, data, width, height) {
    const tex = gl.createTexture();

    if (data !== null) data = new Uint8Array([0, 0, 255, 255]);

    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0, // level
      gl.RGBA, // internalFormat
      width || 1,
      height || 1,
      0, // border
      gl.RGBA, // format
      gl.UNSIGNED_BYTE, // type
      data // data
    );

    for (const p in params) gl.texParameteri(gl.TEXTURE_2D, gl[p], gl[params[p]]);

    return tex;
  },
  loadImage(gl, tex, url) {
    return new Promise((resolve, reject) => {
      let img = new Image();

      img.addEventListener('load', function() {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
        resolve(tex);
      });

      img.addEventListener("error", function() {
        reject(new Error("Failed to load image"));
      });

      img.src = url;
    })
  },
  setupIndices(gl, c) {
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, c.indices, gl.STATIC_DRAW);
  },
  createBackgroundTexture(gl, width, height) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  },
  
  createDepthBuffer(gl, width, height) {
    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    return depthBuffer;
  },
  
  createBackgroundFbo(gl, backgroundTexture, depthBuffer) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      backgroundTexture,
      0
    );
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      depthBuffer
    );
  
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      console.error("Framebuffer is not complete!");
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fbo;
  },
  rgb(r, g, b) {
    return [r/255, g/255, b/255];
  }
}

export default glhelpers;

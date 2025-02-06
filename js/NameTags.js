import { mode } from "./client.js";

class NameTags {
  constructor(position, pointSize, texSize, fontInfo) {
    this.position = position;
    this.u_pointSize = pointSize;
    this.u_texSize = texSize;
    this.u_texture = 1;
    this.fontInfo = fontInfo;
    this.baseSize = 8;

    this.attribs = {
      a_position: { data: [] },
      a_color: {},
      a_texcoord: {},
      a_worldOffset: {}
    }
  }

  generateTags(kernels, generateColors) {
    this.sanitizedNames = {}; // Store preprocessed names
    this.chars = { a_texcoord: [], a_worldOffset: [], a_color: [] };
  
    for (const kernel of kernels) {
      const sanitized = this.getValidCharacters(kernel.name);
      this.sanitizedNames[kernel.name] = sanitized;
  
      this.processName(sanitized, kernel, generateColors);
    }
  
    // Flatten arrays at the end instead of inside loops
    this.attribs.a_texcoord.data = this.chars.a_texcoord.flat();
    this.relOffsets = this.chars.a_worldOffset;
    if (generateColors) this.attribs.a_color.data = this.chars.a_color.flat();
  }  
  
  getValidCharacters(name) {
    let sanitized = "";
    const lowerName = name.toLowerCase();
  
    for (let i = 0; i < lowerName.length; i++) {
      const char = this.sanitizeString(lowerName[i]);
      if (this.fontInfo.items[char]) {
        sanitized += char; // Only keep valid characters
      }
    }
  
    return sanitized;
  }  

  processName(sanitized, kernel, generateColors) {
    for (let i = 0; i < sanitized.length; i++) {
      const item = this.fontInfo.items[sanitized[i]];
      const { a_texcoord, a_worldOffset } = this.generateTexData({ i, ...this.fontInfo, ...item });
  
      this.chars.a_texcoord.push(a_texcoord);
      this.chars.a_worldOffset.push(a_worldOffset);
      if (generateColors) this.chars.a_color.push(kernel.tagColor);
    }
  }

  generateTexData(data) {
    const { i, tw, th, u, v } = data;
  
    const u1 = u / tw;
    const v1 = v / th;
  
    const extraOffset = this.u_pointSize === 16 ? 2 : 0;
    const offsetX = Math.round(extraOffset + i * this.u_pointSize * 0.64);
    const offsetY = extraOffset;
  
    return {
      a_texcoord: [u1, v1],
      a_worldOffset: [offsetX, offsetY]
    }
  }

  sanitizeString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x00-\x7F]/g, "");
  }

  updateRenderables(popcorns) {
    const posData = this.attribs.a_position.data = [];
    const offsetData = this.attribs.a_worldOffset.data = [];
    this.count = 0;

    for (let i = 0, len = popcorns.all.length; i < len; i++) {
      const popcorn = popcorns.all[i];
      let [x, y, z] = popcorn.position;
      if (mode === "time" && !popcorn.blinkState) {
        z += 10000;
      }
      const sanitized = this.sanitizedNames[popcorn.name] || "";
      const absOffset = popcorn.buffer;
  
      for (let j = 0, slen = sanitized.length; j < slen; j++) {
        posData.push(x, y, z);
        const relOffset = this.relOffsets[this.count];
        offsetData.push(
          relOffset[0] + absOffset[0], // x
          relOffset[1] + absOffset[1] // y
        );

        this.count++;
      }
    }
  } 

  updateSize(kernels, setting) {
    const scaleFactor = parseFloat(setting.replace("x", ""));
    this.u_pointSize = this.baseSize * scaleFactor;
    this.u_texture = this.u_pointSize === 8 ? 1 : 2;
    this.generateTags(kernels);
  }
}

export default NameTags;

import { mode } from "./client.js";

class NameTags {
  constructor(position, pointSize, texSize, fontInfo) {
    this.position = position;
    this.u_pointSize = pointSize;
    this.u_texSize = texSize;
    this.u_texture = 1;
    this.fontInfo = fontInfo;
    this.baseSize = 8;
    //this.setOffset();

    this.attribs = {
      a_position: { data: [] },
      a_color: {},
      a_texcoord: {},
      a_worldOffset: {}
    }
  }

  generateTags(kernels, generateColors) {
    const chars = { a_texcoord: [], a_worldOffset: [], a_color: [] };
    for (const kernel of kernels) {
      for (let i = 0; i < kernel.name.length; i++) {
        const char = this.sanitizeString(kernel.name[i].toLowerCase());
        const item = this.fontInfo.items[char];
        if (!item) continue;
  
        const { a_texcoord, a_worldOffset } = this.generateTexData({i, ...this.fontInfo, ...item });
        chars.a_texcoord.push(a_texcoord);
        chars.a_worldOffset.push(a_worldOffset);
        if (generateColors) chars.a_color.push(kernel.tagColor);
      }
    }

    this.chars = chars;
    this.attribs.a_texcoord.data = chars.a_texcoord.flat();
    this.relOffsets = chars.a_worldOffset;
    if (generateColors) this.attribs.a_color.data = chars.a_color.flat();
  }

  generateTexData(data) {
    const { i, tw, th, w, u, v } = data;
  
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
    this.attribs.a_position.data = [];
    this.attribs.a_worldOffset.data = [];
    this.count = 0;
    for (const popcorn of popcorns.all) {
      let [x, y, z] = popcorn.position;
      if (mode === "time" && !popcorn.blinkState) z += 10000;
      for (let char of popcorn.name) {
        const item = this.fontInfo.items[this.sanitizeString(char.toLowerCase())];
        if (!item) continue;
        this.attribs.a_position.data.push(x, y, z);

        const absOffset = popcorn.buffer;
        const relOffset = this.relOffsets[this.count];
        this.attribs.a_worldOffset.data.push(
          absOffset[0] + relOffset[0], // x
          absOffset[1] + relOffset[1], // y
        );
        
        this.count++;
      }
    }
  }

  setOffset() {
    return;
    const spriteSize = mode === "time" ? 32 : 16;
    this.nameTagOffset = [
      (spriteSize + this.u_pointSize)/4 + 2,
      (spriteSize + this.u_pointSize)/4 + 2,
    ]
  }

  updateSize(kernels, setting) {
    const scaleFactor = parseFloat(setting.replace("x", ""));
    this.u_pointSize = this.baseSize * scaleFactor;
    this.u_texture = this.u_pointSize === 8 ? 1 : 2;
    
    //this.setOffset();
    this.generateTags(kernels);
  }

  switchMode(kernels) {
    return;
    this.setOffset();
    this.generateTags(kernels);
  }
}

export default NameTags;

import { mode } from "./client.js";

class NameTags {
  constructor(position, pointSize, texSize, fontInfo) {
    this.position = position;
    this.u_pointSize = pointSize;
    this.u_texSize = texSize;
    this.u_texture = 1;
    this.fontInfo = fontInfo;
    this.baseSize = 8;
    this.setOffset();

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
    this.attribs.a_worldOffset.data = chars.a_worldOffset.flat();
    if (generateColors) this.attribs.a_color.data = chars.a_color.flat();
  }

  generateTexData(data) {
    const { i, tw, th, w, u, v } = data;
  
    const u1 = u / tw;
    const v1 = v / th;
  
    //const offsetX = this.nameTagOffset[0] + i * 6 // Note: Actual offset, including black contour, is 16. Without the contour, it's more like 10.
    const offsetX = Math.round(this.nameTagOffset[0] + i * this.u_pointSize * 0.64);
    const offsetY = this.nameTagOffset[1];
  
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
    this.count = 0;
    for (const popcorn of popcorns.all) {
      let [x, y, z] = popcorn.position;
      if (mode === "time" && !popcorn.blinkState) z += 10000;
      for (let char of popcorn.name) {
        const item = this.fontInfo.items[this.sanitizeString(char.toLowerCase())];
        if (!item) continue;
        this.attribs.a_position.data.push(x, y, z);
        this.count++;
      }
    }
  }

  setOffset() {
    this.nameTagOffset = this.u_pointSize === 8 ? [20, 8] : [24, 16];
  }

  updateSize(kernels, setting) {
    const pointSize = parseFloat(setting.replace("x", ""));
    this.u_pointSize = this.baseSize * pointSize;
    this.setOffset();
    this.generateTags(kernels);
  }
}

export default NameTags;

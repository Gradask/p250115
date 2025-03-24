class NameTags {
  constructor(position, pointSize, texSize, fontInfo) {
    this.position = position;
    this.u_pointSize = pointSize;
    this.u_texSize = texSize;
    this.u_texture = 1;
    this.fontInfo = fontInfo;
    this.baseSize = 8;

    const maxChars = 300 * 10;

    this.attribs = {
      a_position: { data: new Float32Array(maxChars * 3), index: 0 },  // x, y, z
      a_color: { data: new Uint8Array(maxChars * 3), index: 0 },        // r, g, b
      a_texcoord: { data: new Float32Array(maxChars * 2), index: 0 },   // u, v
      a_worldOffset: { data: new Float32Array(maxChars * 2), index: 0 } // x, y
    };
    this.isDirty = true;
  }

  generateTags(popcorns) {
    this.sanitizedNames = {};
  
    for (let i = 0; i < popcorns.length; i++) {
      const popcorn = popcorns[i];
      const sanitized = this.getValidCharacters(popcorn.name);
      this.sanitizedNames[popcorn.name] = sanitized;
      this.processName(sanitized, popcorn);
    }
  }  
  
  getValidCharacters(name) {
    let sanitized = "";
    let lowerName = name.toLowerCase();
  
    for (let i = 0; i < lowerName.length; i++) {
      const char = this.sanitizeString(lowerName[i]);
      if (char === " ") sanitized += char;
      if (this.fontInfo.items[char]) sanitized += char;
    }
  
    return sanitized;
  }  

  processName(sanitized, popcorn) {
      const coords = popcorn.tagCoords;
      const offsets = popcorn.relTagOffsets;
  
      for (let i = 0; i < sanitized.length; i++) {
        const item = this.fontInfo.items[sanitized[i]];
        this.generateTexData({ i, ...this.fontInfo, ...item }, coords, offsets, i);
      }
  
      coords.length = sanitized.length;
      offsets.length = sanitized.length;
  }

  generateTexData(data, coords, offsets, index) {
      const { i, tw, th, u, v } = data;

      const u1 = u / tw;
      const v1 = v / th;
  
      const extraOffset = this.u_pointSize === 16 ? 2 : 0;
      const offsetX = Math.round(extraOffset + i * this.u_pointSize * 0.64);
      const offsetY = extraOffset;
  
      if (!coords[index]) coords[index] = [0, 0];
      if (!offsets[index]) offsets[index] = [0, 0];
  
      coords[index][0] = u1;
      coords[index][1] = v1;
  
      offsets[index][0] = offsetX;
      offsets[index][1] = offsetY;
  }

  sanitizeString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x00-\x7F]/g, "");
  }

  updateSize(pops, setting, popcorns) {
    const scaleFactor = parseFloat(setting.replace("x", ""));
    this.u_pointSize = this.baseSize * scaleFactor;
    this.u_texture = this.u_pointSize === 8 ? 1 : 2;
    this.generateTags(pops);
    this.resetRenderables(popcorns);
  }

  resetRenderables(popcorns) {
    this.emptyRenderables();
    const filtered = popcorns.all.filter(p => p.state !== "disappeared");
    for (let i = 0; i < filtered.length; i++) {
      this.updateRenderables(filtered[i]);
    }
  }

  emptyRenderables() {
    this.attribs.a_position.index = 0;
    this.attribs.a_worldOffset.index = 0;
    this.attribs.a_color.index = 0;
    this.attribs.a_texcoord.index = 0;
    this.count = 0; 
  }

  updateRenderables(popcorn) {
    const sanitized = this.sanitizedNames[popcorn.name] || "";

    const ap = this.attribs.a_position;
    const aw = this.attribs.a_worldOffset;
    const ac = this.attribs.a_color;
    const at = this.attribs.a_texcoord;

    for (let j = 0; j < sanitized.length; j++) {
      this.ensureCapacity(ap, 3);
      ap.data[ap.index++] = popcorn.position[0];
      ap.data[ap.index++] = popcorn.position[1];
      ap.data[ap.index++] = popcorn.position[2];
      ap.isDirty = true;

      this.ensureCapacity(aw, 2);
      aw.data[aw.index++] = popcorn.buffer[0] + popcorn.relTagOffsets[j][0];
      aw.data[aw.index++] = popcorn.buffer[1] + popcorn.relTagOffsets[j][1];
      aw.isDirty = true;

      this.ensureCapacity(ac, 3);
      ac.data[ac.index++] = popcorn.tagColor[0];
      ac.data[ac.index++] = popcorn.tagColor[1];
      ac.data[ac.index++] = popcorn.tagColor[2];
      ac.isDirty = true;

      this.ensureCapacity(at, 2);
      at.data[at.index++] = popcorn.tagCoords[j][0];
      at.data[at.index++] = popcorn.tagCoords[j][1];
      at.isDirty = true;

      this.count++;
    }
  }

  ensureCapacity(attrib, extra) {
    const required = attrib.index + extra;
    if (required > attrib.data.length) {
      const old = attrib.data;
      const doubled = new (old.constructor)(required * 2);
      doubled.set(old);
      attrib.data = doubled;
    }
  }
}

export default NameTags;

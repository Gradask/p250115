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
      a_color: { data: [] },
      a_texcoord: { data: [] },
      a_worldOffset: { data: [] }
    }
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
    popcorn.tagCoords = [];
    popcorn.relTagOffsets = [];
    
    for (let i = 0; i < sanitized.length; i++) {
      const item = this.fontInfo.items[sanitized[i]];
      const { a_texcoord, a_worldOffset } = this.generateTexData({ i, ...this.fontInfo, ...item });
      popcorn.tagCoords.push(a_texcoord);
      popcorn.relTagOffsets.push(a_worldOffset);
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
    this.attribs.a_position.data.length = 0;
    this.attribs.a_worldOffset.data.length = 0;
    this.attribs.a_color.data.length = 0;
    this.attribs.a_texcoord.data.length = 0;
    this.count = 0;
  }

  updateRenderables(popcorn) {
    const sanitized = this.sanitizedNames[popcorn.name] || "";

    for (let j = 0; j < sanitized.length; j++) {
      this.attribs.a_position.data.push(
        popcorn.position[0],
        popcorn.position[1],
        popcorn.position[2]
      );
      this.attribs.a_position.isDirty = true;

      this.attribs.a_worldOffset.data.push(
        popcorn.buffer[0] + popcorn.relTagOffsets[j][0],
        popcorn.buffer[1] + popcorn.relTagOffsets[j][1],
      );
      this.attribs.a_worldOffset.isDirty = true;
      
      this.attribs.a_color.data.push(
        popcorn.tagColor[0],
        popcorn.tagColor[1],
        popcorn.tagColor[2]
      );
      this.attribs.a_color.isDirty = true;

      this.attribs.a_texcoord.data.push(
        popcorn.tagCoords[j][0],
        popcorn.tagCoords[j][1]
      );
      this.attribs.a_texcoord.isDirty = true;

      this.count++;
    }
  }
}

export default NameTags;

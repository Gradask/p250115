const gltfhelpers = {
  getTypedArrayConstructor(componentType) {
    switch (componentType) {
      case 5120: return Int8Array;
      case 5121: return Uint8Array;
      case 5122: return Int16Array;
      case 5123: return Uint16Array;
      case 5125: return Uint32Array;
      case 5126: return Float32Array;
      default: throw new Error(`Unsupported component type: ${componentType}`);
    }
  },
  getComponentSize(componentType) {
    switch (componentType) {
      case 5120: case 5121: return 1;  // BYTE or UNSIGNED_BYTE
      case 5122: case 5123: return 2;  // SHORT or UNSIGNED_SHORT
      case 5125: return 4;             // UNSIGNED_INT
      case 5126: return 4;             // FLOAT
      default: throw new Error(`Unsupported component type: ${componentType}`);
    }
  },
  getNumComponents(type) {
    switch (type) {
      case 'SCALAR': return 1;
      case 'VEC2': return 2;
      case 'VEC3': return 3;
      case 'VEC4': return 4;
      default: throw new Error(`Unknown attribute type: ${type}`);
    }
  },
  parseGLTF(data) {
    data.gltf = JSON.parse(data.gltf);
    Object.assign(data, this.parseData(data.gltf, data.bin));
  },
  base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  },
  parseData(gltf, binBuffer) {
    this.validateMeshData(gltf, binBuffer);
    const rootNodeIdx = gltf.scenes[0].nodes[0];
  
    const meshes = [];
    const empties = [];
    let i = 0;

    // Parse nodes for hierarchy information
    if (gltf.nodes) {
      for (const node of gltf.nodes) {
        if (node.mesh !== undefined) {
          meshes.push({
            name: node.name,
            nodeIdx: i,
            meshIdx: node.mesh,
            rootNode: gltf.scenes[0].nodes.includes(node.mesh) ? true : false,
            primitives: gltf.meshes[node.mesh].primitives.map(primitive => {
              return this.extractPrimitiveData(primitive, gltf, binBuffer);
            }),
            children: node.children || null
          });
        } else {
          empties.push({
            name: node.name,
            nodeIdx: i,
            translation: [node.translation[0], node.translation[1], 0]
          });
        }
      }
    }
  
    const materials = this.parseMaterials(gltf);
  
    return { rootNodeIdx, empties, meshes, materials };
  },
  extractPrimitiveData(primitive, gltf, binBuffer) {
    const extractedData = {};
    // Extract attributes like POSITION, NORMALS, etc.
    Object.entries(primitive.attributes).forEach(([key, accessorIndex]) => {
      const attributeData = this.getBufferData(gltf, accessorIndex, binBuffer);
      extractedData[key] = attributeData;
    });
  
    // Extract indices if present
    if (primitive.indices !== undefined) {
      const indexAccessor = gltf.accessors[primitive.indices];
      const indexData = this.getBufferData(gltf, primitive.indices, binBuffer);
      extractedData['indices'] = indexData;
    }
  
    // Add material information
    if (primitive.material !== undefined) {
      extractedData['material'] = primitive.material;
    }
  
    return extractedData;
  },
  getBufferData(gltf, accessorIndex, binBuffer) {
    const accessor = gltf.accessors[accessorIndex];
    const bufferView = gltf.bufferViews[accessor.bufferView];
    const numComponents = this.getNumComponents(accessor.type);
    const componentSize = this.getComponentSize(accessor.componentType);
    const expectedByteLength = accessor.count * numComponents * componentSize;
  
    if (bufferView.byteLength < expectedByteLength) {
      console.error(`Byte length mismatch for accessor ${accessorIndex}! Expected at least: ${expectedByteLength}, but got: ${bufferView.byteLength}.`);
      return;
    }
  
    const dataStart = bufferView.byteOffset + (accessor.byteOffset || 0);
    const dataEnd = dataStart + expectedByteLength;
  
    if (dataEnd > binBuffer.byteLength) {
      console.error(`Data range for accessor ${accessorIndex} extends beyond buffer limits.`);
      return;
    }
  
    const TypedArrayConstructor = this.getTypedArrayConstructor(accessor.componentType);
    return new TypedArrayConstructor(binBuffer, dataStart, accessor.count * numComponents);
  },
  parseMaterials(gltf) {
    if (!gltf.materials) {
      return [];
    }
  
    return gltf.materials.map((material, index) => {
      const parsedMaterial = {
        name: material.name || `material_${index}`,
        baseColorFactor: material.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1],
        metallicFactor: material.pbrMetallicRoughness?.metallicFactor || 1.0,
        roughnessFactor: material.pbrMetallicRoughness?.roughnessFactor || 1.0,
        baseColorTexture: this.parseTexture(material.pbrMetallicRoughness?.baseColorTexture, gltf),
        metallicRoughnessTexture: this.parseTexture(material.pbrMetallicRoughness?.metallicRoughnessTexture, gltf),
        normalTexture: this.parseTexture(material.normalTexture, gltf),
        emissiveFactor: material.emissiveFactor || [0, 0, 0],
        alphaMode: material.alphaMode || 'OPAQUE'
      };
  
      return parsedMaterial;
    });
  },
  parseTexture(textureInfo, gltf) {
    if (!textureInfo) {
      return null;
    }
  
    const textureIndex = textureInfo.index;
    const texture = gltf.textures[textureIndex];
    const image = gltf.images[texture.source];
  
    return {
      uri: `../mesh/${image.uri}`,
      sampler: gltf.samplers?.[texture.sampler] || null
    };
  },
  parseAnimations(gltf, binBuffer) {
    const animations = {};
    if (!gltf.animations) {
      return animations; // No animations found
    }
    gltf.animations.forEach((animation, index) => {
      const channels = animation.channels.map(channel => {
        const sampler = animation.samplers[channel.sampler];
        const input = this.getBufferData(gltf, sampler.input, binBuffer);
        const output = this.getBufferData(gltf, sampler.output, binBuffer);
        let deg = null;
        if (channel.target.path === "rotation") {
          deg = this.quaternionArrayToDegrees(output);
        }
        return {
          targetNode: channel.target.node,
          path: channel.target.path,
          interpolation: sampler.interpolation,
          input,
          output,
          deg
        };
      });
      animations[channels[index].targetNode] = channels;
    });
    return animations;
  },
  validateMeshData(gltf, binBuffer) {
    gltf.meshes.forEach((mesh, meshIndex) => {
      mesh.primitives.forEach((primitive, primitiveIndex) => {
        // Assuming positions are always present
        const positionAccessorIndex = primitive.attributes.POSITION;
        const accessor = gltf.accessors[positionAccessorIndex];
        const bufferView = gltf.bufferViews[accessor.bufferView];

        // Checking byte length consistency
        const expectedByteLength = accessor.count * 3 * 4; // 3 components per vertex, 4 bytes per component (FLOAT)

        // Validate byte length
        if (bufferView.byteLength !== expectedByteLength) {
            console.error(`! Byte length mismatch! Expected ${expectedByteLength}, found ${bufferView.byteLength}.`);
        }

        // Validate bufferView offset and length within binary buffer bounds
        if (bufferView.byteOffset + bufferView.byteLength > binBuffer.byteLength) {
            console.error(`! BufferView exceeds binary buffer bounds! Byte offset + length = ${bufferView.byteOffset + bufferView.byteLength}, buffer length = ${binBuffer.byteLength}`);
        }

        // Optionally, inspect the first few vertices
        const positions = new Float32Array(binBuffer, bufferView.byteOffset, accessor.count * 3);
      });
    });
  },
  convertQuaternionArrayToDegreesOld(outputArray) {
    const results = [];
    const degreesPerRadian = 180 / Math.PI;

    for (let i = 0; i < outputArray.length; i += 4) {
      let x = outputArray[i];      // Ignored, should be 0
      let z = outputArray[i + 2];  // Sine of half the angle
      let y = outputArray[i + 1];  // Ignored, should be -0
      let w = outputArray[i + 3];  // Cosine of half the angle

      let angle = 2 * Math.atan2(z, w) * degreesPerRadian; // Convert to full angle in degrees
      angle = (angle + 360) % 360; // Normalize

      results.push([x, y, angle]);
    }

    return results;
  },
  quaternionToEulerAngles(quaternion) {
    const [x, y, z, w] = quaternion; // Assuming order [x, y, z, w] from Blender
    const degreesPerRadian = 180 / Math.PI;

    // Roll (x-axis rotation)
    const sinr_cosp = 2 * (w * x + y * z);
    const cosr_cosp = 1 - 2 * (x * x + y * y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp) * degreesPerRadian;

    // Pitch (y-axis rotation)
    let sinp = 2 * (w * y - z * x);
    let pitch;
    if (Math.abs(sinp) >= 1)
      pitch = Math.sign(sinp) * Math.PI / 2 * degreesPerRadian; // Use 90 degrees if out of range
    else
       pitch = Math.asin(sinp) * degreesPerRadian;

    // Yaw (z-axis rotation)
    const siny_cosp = 2 * (w * z + x * y);
    const cosy_cosp = 1 - 2 * (y * y + z * z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp) * degreesPerRadian;

    return [this.normalizeAngle(roll), this.normalizeAngle(pitch), this.normalizeAngle(yaw)];
  },
  normalizeAngle(angle) {
    return (angle + 360) % 360;
  },
  quaternionArrayToDegrees(outputArray) {
    const results = [];
    for (let i = 0; i < outputArray.length; i += 4) {
      const quaternion = outputArray.slice(i, i + 4);
      const eulerAngles = this.quaternionToEulerAngles(quaternion);
      results.push(eulerAngles);
    }
    return results;
  }
}

export default gltfhelpers;
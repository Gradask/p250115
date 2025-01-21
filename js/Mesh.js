import gltfhelpers from "./gltfhelpers.js";
import mat4helpers from "./mat4helpers.js";

class Mesh {
  constructor(position, meshId) {
    this.attribs = { a_position: {}, a_normal: {}, a_texcoord: {} };
    this.position = position;
    this.loadMesh(meshId);
  }

  async loadMesh(meshId) {
    const data = {};
    const gltf = await fetch(`../mesh/${meshId}.gltf`);
    data.gltf = await gltf.text();

    const bin = await fetch(`../mesh/${meshId}.bin`);
    data.bin = await bin.arrayBuffer();

    gltfhelpers.parseGLTF(data);
    this.nodeIdx = 0;
    this.setupMesh(data);
  }

  setupMesh(data) {
    const mesh = data.meshes.find(mesh => mesh.nodeIdx === this.nodeIdx);
    this.primitives = mesh.primitives[0];

    this.meshIdx = mesh.meshIdx;
    this.attribs.a_normal.data = this.primitives.NORMAL;
    this.attribs.a_position.data = this.primitives.POSITION;
    this.attribs.a_texcoord.data = this.primitives.TEXCOORD_0;
    this.indices = this.primitives.indices;
    this.materials = data.materials;
    
    this.u_normalTexture = 2;
    this.u_metallicFactor = this.materials[0].metallicFactor;
    this.u_roughnessFactor = this.materials[0].roughnessFactor;

    let mMat = mat4helpers.identityMatrix();
    mMat = mat4helpers.xRotate(mMat, 90 * Math.PI/180)
    this.mMat = mat4helpers.yRotate(mMat, 90 * Math.PI/180);
    
    this.isReady = true;
    this.isDirty = true;
  }
}

export default Mesh;
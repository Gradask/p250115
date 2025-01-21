import mat4helpers from "./mat4helpers.js";

class Camera {
  constructor() {
    this.tgt = [0, 0, 0];
    this.up = [0, 0, 1];
    this.scaleFactor = 60;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.near = 0.1;
    this.far = 200;
    this.time();
    this.getMat();
  }

  updateViewport() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  lobby() {
    this.move(0.5, -0.5, 0.5);
  }

  time() {
    this.move(0.1, -0.1, 0.45);
  }

  distance() {
    this.move(0.9, -0.9, 0.9);
  }

  move(x, y, z) {
    this.position = [
      this.scaleFactor * x,
      this.scaleFactor * y,
      this.scaleFactor * z
    ]
  }

  getMat() {
    const aspect =  this.width / this.height;
    const fov = Math.PI / 10;

    this.vMat = mat4helpers.lookAt(this.position, this.tgt, this.up);
    this.pMat = mat4helpers.perspective(fov, aspect, this.near, this.far);
    this.vpMat = mat4helpers.multiply(this.pMat, this.vMat);
  }
}

export default Camera;

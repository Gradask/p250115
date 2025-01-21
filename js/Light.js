class Light {
  constructor() {
    this.dir = [1.3, -0.8, -0.4];
    this.normalizedDir = this.computeLightDirection();
  }

  computeLightDirection() {
    let magnitude = Math.sqrt(this.dir.reduce((sum, val) => sum + val * val, 0));
    return this.dir.map(x => x / magnitude);
  }
}

export default Light;
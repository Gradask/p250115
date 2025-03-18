class Light {
  constructor() {
    this.time();
    this.normalizedDir = this.computeLightDirection();
  }

  time() {
    this.dir = [
      0.34944225579,
      -0.62416338369,
      0.06236056394
    ]
  }

  distance() {
    this.dir = [
      1.3,
      -0.8,
      -0.4
    ];
  }

  computeLightDirection() {
    let magnitude = Math.sqrt(this.dir.reduce((sum, val) => sum + val * val, 0));
    return this.dir.map(x => x / magnitude);
  }
}

export default Light;

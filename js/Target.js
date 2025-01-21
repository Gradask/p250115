class Target {
  constructor(position, PPI, worldRadius, numRings, colors) {
    this.position = position;
    this.radius = PPI * worldRadius; // diameter? eller öka radien till 40
    this.numRings = numRings;
    this.segments = 64; // More segments for smoother circles
    this.colors = colors;
    this.attribs = { a_position: { data: [] }, a_color: { data: [] } };
    this.a_position = [];
    this.a_color = [];
    this.generateRings();
    this.isReady = true;
  }

  generateRings() {
    const steps = this.radius / this.numRings;
  
    for (let i = 0; i < this.numRings; i++) {
      const innerRadius = i * steps;
      const outerRadius = (i + 1) * steps;

      // Alternating colors for the rings
      const color = i % 2 === 0 ? this.colors[0] : this.colors[1];

      for (let j = 0; j < this.segments; j++) {
        const angle1 = (j / this.segments) * Math.PI * 2;
        const angle2 = ((j + 1) / this.segments) * Math.PI * 2;

        // Outer triangle
        this.attribs.a_position.data.push(
          Math.cos(angle1) * outerRadius, Math.sin(angle1) * outerRadius, 0,
          Math.cos(angle2) * outerRadius, Math.sin(angle2) * outerRadius, 0,
          Math.cos(angle1) * innerRadius, Math.sin(angle1) * innerRadius, 0
        );

        // Inner triangle
        this.attribs.a_position.data.push(
          Math.cos(angle1) * innerRadius, Math.sin(angle1) * innerRadius, 0,
          Math.cos(angle2) * outerRadius, Math.sin(angle2) * outerRadius, 0,
          Math.cos(angle2) * innerRadius, Math.sin(angle2) * innerRadius, 0
        );

        // Color data for both triangles
        for (let k = 0; k < 6; k++) {
          this.attribs.a_color.data.push(...color);
        }
      }
    }
  }
}

export default Target;
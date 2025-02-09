import { mode } from "./client.js";

const predefinedColors = [
  [175, 0, 0], // Red
  [0, 90, 30], // Green
  /* [140, 70, 0], */ // Brown
  [0, 75, 150], // Blue
  [100, 0, 150], // Purple
]

let colorIndex = 0;
let spriteIndex = 0;
let id = 0;

class Popcorn {
  constructor(name, maxPopTime) {
    this.name = name;
    this.id = id++;
    this.worldOffset = [0, 0];
    this.color = [255, 0, 0];
    this.tagColor = this.getColor();
    this.blinkDuration = 0.5;

    this.minZVelocity = 2;
    this.reset(maxPopTime);
  }

  reset(maxPopTime, elapsedTime = null) {
    this.state = "kernel";
    this.maxPopTime = maxPopTime || this.maxPopTime;
    this.popTime = this.generateTime(this.maxPopTime);
    this.velocity = [0, 0, 0];
    this.a_texcoord = this.getKernelSprite();
    if (elapsedTime === null || elapsedTime > 0) this.position = this.getPosition();
    this.blink = true;
    this.blinkState = true;
    this.startBlinkTime = null;
    this.isInside = true;

    this.startTime = null;
    this.hasBeenInTheLead = null;

    this.getBuffer();
  }

  pop(elapsedTime) {
    this.time = elapsedTime;
    this.state = "popping";
    this.velocity = this.getVelocity();
    this.a_texcoord = this.getPopcornSprite();
    this.getBuffer();
  }

  stop() {
    this.state = "stopped";
    this.getRadialDistance();
  }

  disappear() {
    this.state = "disappeared";
  }

  getBuffer() {
    const size = mode === "time" ? 32 : 16;
    const scale = this.state === "kernel" ? 1 : 1.5;
    this.buffer = [
      Math.round(scale * size * 0.35), // x
      Math.round(scale * size * 0.35) // y
    ];
  }

  getKernelSprite() {
    return [0.8, 0.25];
  }
  
  getPopcornSprite() {
    const texcoords = [
        [0.4, 0.25],    // Sprite 1 
        [0.6, 0.25],    // Sprite 2
        [0.2, 0.25]     // Sprite 3
    ];
    const coords = texcoords[spriteIndex];
    spriteIndex = (spriteIndex + 1) % texcoords.length;
    return coords;
  }

  getColor() {
    const color = predefinedColors[colorIndex];
    colorIndex = (colorIndex + 1) % predefinedColors.length;
    return color;
  }

  getPosition() {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * 170; // 170 = saucepan radius
    const x = distance * Math.cos(angle);
    const y = distance * Math.sin(angle);
    return [x, y, 0];
  }

  getRadialDistance() {
    this.radialDistance = Math.sqrt(this.position[0] ** 2 + this.position[1] ** 2);
  }

  generateTime(maxTime) {
    let time;
    do {
        time = this.generateNormalDistribution(maxTime / 2, maxTime / 6);
    } while (time < 0 || time > maxTime);
    return time;
  }

  generateNormalDistribution(mean, standardDeviation) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2); // Standard normal variable
    return z0 * standardDeviation + mean; // Scale to desired mean and standard deviation
  }

  getVelocity() {
    const angle = Math.random() * 2 * Math.PI; // Random angle from 0 to 2π
    const r = Math.sqrt(Math.random()); // Random radius in [0..1], using sqrt to ensure a uniform distribution in the circle
    
    // Convert polar (r, angle) to Cartesian (x, y)
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    const z = 0.1 * Math.random() * 5 + this.minZVelocity; // Random z velocity
    
    return [x, y, z];
  }
}

export default Popcorn;

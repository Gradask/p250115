import { mode } from "./client.js";
import mat4helpers from "./mat4helpers.js";

class Popcorns {
  constructor(position, pointSize, texSize, PPI, modes) {
    this.all = [];
    this.kernels = [];
    this.popcorns = [];

    // Time
    this.maxTime = 60;
    this.elapsedTime = 0;
    this.kernelTime = 0;
    this.lastime;
    this.baselineDeltaTime = 16.7; // 50 fps
    this.maxDeltaTime = 67; // ~15 fps
    
    // Physics
    this.saucepanRadius = 170;
    this.saucepanHeight = 143;
    this.PPI = PPI; // pixels per inch
    this.frictionFactor = 0.98 * 0.75; // Damping factor for x and y movement on the ground
    this.velocityThreshold = 0.05; // Minimum velocity below which motion stops
    
    // Renderables
    this.position = position;
    this.u_pointSize = pointSize;
    this.u_texSize = texSize;
    this.u_texture = 0;
    this.attribs = {
      a_position: { data: [] },
      a_color: {},
      a_texcoord: {},
      a_worldOffset: {}
    }

    // Sound effect
    this.popSound = new Audio("audio/pop.wav");
    this.maxConcurrentPops = 10;
    this.activePops = 0;

    this.modes = modes;
  }

  reset() {
   this.resetPopcorns();
   this.resetTime();
   this.resetModes();
  }

  updateMaxTime(setting) {
    const rate = parseFloat(setting.replace("x", ""));
    //this.maxTime = 60 / rate;
    this.rate = rate;
  }

  resetPopcorns() {
    this.popcorns = [];
    this.kernels = [...this.all];
    this.shuffleArray(this.kernels);
    for (const kernel of this.kernels) kernel.reset(this.maxTime, this.elapsedTime);
    this.kernels.sort((a, b) => a.popTime - b.popTime);
    this.addSuspense();
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[randomIndex]] = [arr[randomIndex], arr[i]];
    }
  }

  switchMode(mode) {
    this.mode = mode;
    this.u_pointSize = mode === "time" ? 32 : 16;
  }

  addSuspense() {
    // Spread out top 3 for increased suspense
    const last = this.kernels[this.kernels.length - 1];
    const secondToLast = this.kernels[this.kernels.length - 2];
    const scaleFactor = this.maxTime/60; // 0.1, 0.5, 1, 2, 10
    if (!secondToLast) return;
    last.popTime += scaleFactor; 
    secondToLast.popTime += scaleFactor;
  }

  resetTime() {
    this.lastTime = performance.now();
    this.elapsedTime = 0;
    this.kernelTime = 0;
  }

  resetModes() {
    for (const mode in this.modes) this.modes[mode].reset();
  }

  generateKernels(records) {
    this.kernels = [...records];
    this.all = [...records];

    this.attribs.a_worldOffset.data = this.all.flatMap(p => p.worldOffset);
    this.updateRenderables();
  }

  updateRenderables() {
    this.attribs.a_position.data = [];
    this.attribs.a_texcoord.data = [];

    for (const popcorn of this.all) {
      if (mode === "distance" || popcorn.blinkState) {
        this.attribs.a_position.data.push(...popcorn.position);
        this.attribs.a_texcoord.data.push(...popcorn.a_texcoord);
      }
    }

    this.count = this.attribs.a_position.data.length/3;
  }

  update(time) {
    let deltaTime = (time - this.lastTime) || 16.7;
    deltaTime = deltaTime > this.maxDeltaTime ? this.maxDeltaTime : deltaTime; // Cap deltaTime to a reasonable max value
    const timeScale = deltaTime / this.baselineDeltaTime;
  
    this.elapsedTime += deltaTime / 1000;
    this.kernelTime += deltaTime / 1000 * this.rate;
    console.log(this.elapsedTime, this.kernelTime)
    this.lastTime = time;

    if (this.kernels.length > 0) this.updateKernels(); 
    if (this.popcorns.length > 0) this.updatePopcorns(timeScale * 10);
  }

  updateKernels() {
    while (this.kernels.length > 0 && this.kernels[0].popTime <= /*this.elapsedTime*/this.kernelTime) {
      const popcorn = this.kernels.shift();
      popcorn.pop(this.elapsedTime);
      this.popcorns.push(popcorn);
      this.playPop();
      if (mode === "time") this.updateTimeResults();
    }
  }

  updatePopcorns(deltaTime) {
    for (const popcorn of this.popcorns) {
      if (popcorn.state === "popped") {
        if (popcorn.blink) {
          if (!popcorn.startBlinkTime) popcorn.startBlinkTime = this.elapsedTime;
      
          const elapsed = this.elapsedTime - popcorn.startBlinkTime;
      
          if (elapsed >= 0.5) {
            const blinkElapsed = elapsed - 0.5;
            popcorn.blinkState = ((blinkElapsed * 10) | 0) % 2 === 0; // Toggle
            if (blinkElapsed >= popcorn.blinkDuration) {
              popcorn.blinkState = false;
              popcorn.blink = false;
            }
          } else {
            popcorn.blinkState = true;
          }
        }
        continue;
      }
    
      popcorn.velocity[2] -= 9.81 * deltaTime * 0.001; // Apply gravity
      
      // Predict and check for collisions with cylinder
      if (popcorn.position[2] <= this.saucepanHeight) {
        this.checkCollision(popcorn, deltaTime);
      }

      // Update position
      popcorn.position[0] += popcorn.velocity[0] * deltaTime;
      popcorn.position[1] += popcorn.velocity[1] * deltaTime;
      popcorn.position[2] += popcorn.velocity[2] * deltaTime;
    
      // Collisions with floor
      if (popcorn.position[2] < 0) {
        popcorn.position[2] = 0;
        popcorn.velocity[2] *= -0.8; // Bounce
      
      // Apply friction to x and y velocities
        popcorn.velocity[0] *= this.frictionFactor;
        popcorn.velocity[1] *= this.frictionFactor;
        popcorn.velocity[2] *= this.frictionFactor;
      
        // Stop movement if velocity is below threshold
        if (Math.abs(popcorn.velocity[0]) < this.velocityThreshold) popcorn.velocity[0] = 0;
        if (Math.abs(popcorn.velocity[1]) < this.velocityThreshold) popcorn.velocity[1] = 0;
      
        if (popcorn.velocity[0] === 0 && popcorn.velocity[1] === 0) {
          popcorn.stop();
          if (mode === "distance") this.updateDistanceResults();
        }
      }
    }
  }

  checkCollision(popcorn, deltaTime) {
    const radialDistance = Math.sqrt(popcorn.position[0] ** 2 + popcorn.position[1] ** 2);
  
    // Predict next position
    const nextPosition = [
      popcorn.position[0] + popcorn.velocity[0] * deltaTime,
      popcorn.position[1] + popcorn.velocity[1] * deltaTime,
      popcorn.position[2] + popcorn.velocity[2] * deltaTime,
    ];

    const nextRadialDistance = Math.sqrt(nextPosition[0] ** 2 + nextPosition[1] ** 2);
  
    // Check if trajectory crosses the wall
    if (radialDistance <= this.saucepanRadius && nextRadialDistance > this.saucepanRadius && popcorn.position[2] <= this.saucepanHeight) {
      // Calculate intersection point
      const dx = nextPosition[0] - popcorn.position[0];
      const dy = nextPosition[1] - popcorn.position[1];
      const dz = nextPosition[2] - popcorn.position[2];
  
      const t = (this.saucepanRadius - radialDistance) / Math.sqrt(dx ** 2 + dy ** 2); // Ratio of movement toward the wall
      const collisionPoint = [
        popcorn.position[0] + dx * t,
        popcorn.position[1] + dy * t,
        popcorn.position[2] + dz * t,
      ];
  
      // Reflect velocity along the wall's normal
      const normal = [
        collisionPoint[0] / this.saucepanRadius,
        collisionPoint[1] / this.saucepanRadius,
        0, // Horizontal
      ];
      const velocityDotNormal = mat4helpers.dot(popcorn.velocity, normal);
      popcorn.velocity[0] -= 2 * velocityDotNormal * normal[0];
      popcorn.velocity[1] -= 2 * velocityDotNormal * normal[1];
  
      // Adjust position to the wall boundary
      popcorn.position[0] = normal[0] * this.saucepanRadius;
      popcorn.position[1] = normal[1] * this.saucepanRadius;
    }
  }

  updateTimeResults() {
    if (this.kernels.length === 1) {
      this.modes.time.winner = this.kernels[0];
      this.modes.time.stop();
    }
  }

  updateDistanceResults() {
    if (this.kernels.length === 0 && !this.popcorns.some(p => p.state === "popping")) {
      this.popcorns.sort((a, b) => b.radialDistance - a.radialDistance);
      this.modes.distance.winner = this.popcorns[0];
      this.modes.distance.stop();
    }
  }

  playPop() {
    if (this.activePops < this.maxConcurrentPops) {
      const newSound = this.popSound.cloneNode();
      newSound.volume = 1;
      this.activePops++;
      newSound.play();
  
      // Cleanup
      newSound.onended = () => {
        this.activePops--;
        newSound.remove();
      };
    }
  }
}

export default Popcorns;

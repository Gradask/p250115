import { mode } from "./client.js";
import mat4helpers from "./mat4helpers.js";

class Popcorns {
  constructor(position, pointSize, texSize, PPI, modes) {
    this.all = [];
    this.popcorns = [];

    // Time
    this.maxTime = 60;
    this.rate = 1;
    this.elapsedTime = 0;
    this.kernelTime = 0;
    this.lastime;
    this.baselineDeltaTime = 16.7; // 50 fps
    this.maxDeltaTime = 67; // ~15 fps
    
    // Physics
    this.gravity = 9.81 * 0.001;
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
      a_color: { data: [] },
      a_texcoord: { data: [] },
      a_worldOffset: { data: [] }
    }

    // Sound effect
    this.maxConcurrentPops = 10;
    this.activePops = 0;
    this.popSounds = Array.from({ length: this.maxConcurrentPops }, () => new Audio("audio/pop.wav"));
    this.soundIndex = 0;

    this.modes = modes;
    this.isDirty = true;
  }

  reset() {
   this.resetPopcorns();
   this.resetTime();
   this.resetModes();
   this.resetRenderables();
  }

  updateMaxTime(setting) {
    const rate = parseFloat(setting.replace("x", ""));
    this.rate = rate;
  }

  resetPopcorns() {
    this.popcorns = [...this.all];
    this.shuffleArray(this.popcorns);
    for (const popcorn of this.popcorns) popcorn.reset(this.maxTime, this.elapsedTime);
    this.popcorns.sort((a, b) => a.popTime - b.popTime);
    this.addSuspense();
    this.kernelCount = this.all.length;
    this.stoppedCount = 0;
    this.disappearedCount = 0;
  }
  
  resetTime() {
    this.lastTime = performance.now();
    this.elapsedTime = 0;
    this.kernelTime = 0;
  }
  
  resetModes() {
    for (const mode in this.modes) this.modes[mode].reset();
  }

  resetRenderables() {
    this.emptyRenderables();
    for (let i = 0; i < this.all.length; i++) {
      this.updateRenderables(this.all[i]);
    }
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
    const last = this.all[this.all.length - 1];
    const secondToLast = this.all[this.all.length - 2];
    const scaleFactor = this.maxTime/60; // 0.1, 0.5, 1, 2, 10
    if (!secondToLast) return;
    last.popTime += scaleFactor; 
    secondToLast.popTime += scaleFactor;
  }

  generateKernels(records) {
    this.popcorns = [...records];
    this.all = [...records];
    this.resetRenderables();
  }

  update(time, nameTags) {
    let deltaTime = (time - this.lastTime) || 16.7;
    deltaTime = deltaTime > this.maxDeltaTime ? this.maxDeltaTime : deltaTime; // Cap dt
    const timeScale = 10 * deltaTime / this.baselineDeltaTime;

    this.elapsedTime += deltaTime / 1000;
    this.kernelTime += deltaTime / 1000 * this.rate;
    this.lastTime = time;

    const deltaGravity = this.gravity * timeScale;

    this.emptyRenderables();
    nameTags.emptyRenderables();

    for (let i = 0; i < this.popcorns.length; i++) {
      const popcorn = this.popcorns[i];

      if (popcorn.state === "kernel") {
        if (mode === "distance" || this.kernelCount > 1) this.updateKernel(popcorn);
      } else if (popcorn.state === "popping") {
        this.updatePopping(popcorn, timeScale, deltaGravity);
      } else if (popcorn.state === "stopped" && mode === "time") {
        this.updateStopped(popcorn);
        if (!popcorn.blinkState) continue;
      } else if (popcorn.state === "disappeared") {
        continue;
      }

      this.updateRenderables(popcorn);
      nameTags.updateRenderables(popcorn);
    }

    if (mode === "time" && this.disappearedCount === this.all.length - 1) {
      this.updateTimeResults();
    }

    if (mode === "distance" && this.stoppedCount === this.all.length) {
      this.updateDistanceResults();
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
    this.attribs.a_worldOffset.data.push(
      popcorn.worldOffset[0],
      popcorn.worldOffset[1]
    );

    this.attribs.a_color.data.push(
      popcorn.color[0],
      popcorn.color[1],
      popcorn.color[2],
    );

    this.attribs.a_position.data.push(
      popcorn.position[0],
      popcorn.position[1],
      popcorn.position[2]
    );

    this.attribs.a_texcoord.data.push(
      popcorn.a_texcoord[0],
      popcorn.a_texcoord[1]
    );

    this.count++;
  }

  updateKernel(kernel) {
    if (kernel.popTime <= this.kernelTime) {
      kernel.pop(this.elapsedTime);
      //this.playPop();
      this.kernelCount--;
    }
  }

  updatePopping(popcorn, deltaTime, deltaGravity) {
    popcorn.velocity[2] -= deltaGravity; // Apply gravity
      
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
        this.stoppedCount++;
      }
    }
  }

  updateStopped(popcorn) {
    if (!popcorn.startBlinkTime) popcorn.startBlinkTime = this.elapsedTime;
    const elapsed = this.elapsedTime - popcorn.startBlinkTime;

    if (elapsed >= 0.5) {
      const blinkElapsed = elapsed - 0.5;
      popcorn.blinkState = ((blinkElapsed * 10) | 0) % 2 === 0;
      if (blinkElapsed >= popcorn.blinkDuration) {
        popcorn.blinkState = false;
        popcorn.disappear();
        this.disappearedCount++;
      }
    } else {
      popcorn.blinkState = true;
    }
  }

  updateTimeResults() {
    this.modes.time.winner = this.popcorns.find(p => p.state !== "disappeared");
    this.modes.time.stop();
    console.log("this.modes.time.winner", this.modes.time.winner)
  }

  updateDistanceResults() {
    this.popcorns.sort((a, b) => b.radialDistance - a.radialDistance);
    this.modes.distance.winner = this.popcorns[0];
    this.modes.distance.stop();
  }

  checkCollision(popcorn, deltaTime) {
    const rSquared = popcorn.position[0] ** 2 + popcorn.position[1] ** 2;
    const nextPosition = [
      popcorn.position[0] + popcorn.velocity[0] * deltaTime,
      popcorn.position[1] + popcorn.velocity[1] * deltaTime,
      popcorn.position[2] + popcorn.velocity[2] * deltaTime,
    ];
    const nextRSquared = nextPosition[0] ** 2 + nextPosition[1] ** 2;
  
    if (rSquared <= this.saucepanRadius ** 2 && nextRSquared > this.saucepanRadius ** 2 && popcorn.position[2] <= this.saucepanHeight) {
      const radialDistance = Math.sqrt(rSquared);
      const dx = nextPosition[0] - popcorn.position[0];
      const dy = nextPosition[1] - popcorn.position[1];
      const dz = nextPosition[2] - popcorn.position[2];
      const movementDistance = Math.sqrt(dx ** 2 + dy ** 2);
  
      if (movementDistance > 0) {
        const t = (this.saucepanRadius - radialDistance) / movementDistance;
        const collisionPoint = [
          popcorn.position[0] + dx * t,
          popcorn.position[1] + dy * t,
          popcorn.position[2] + dz * t,
        ];
  
        const normal = [
          collisionPoint[0] / this.saucepanRadius,
          collisionPoint[1] / this.saucepanRadius,
          0,
        ];
        const velocityDotNormal = mat4helpers.dot(popcorn.velocity, normal);
        popcorn.velocity[0] -= 2 * velocityDotNormal * normal[0];
        popcorn.velocity[1] -= 2 * velocityDotNormal * normal[1];
  
        popcorn.position[0] = normal[0] * this.saucepanRadius;
        popcorn.position[1] = normal[1] * this.saucepanRadius;
      }
    }
  }

  playPop() {
    if (this.activePops < this.maxConcurrentPops) {
      const sound = this.popSounds[this.soundIndex];
      sound.currentTime = 0;
      sound.play();
      
      this.soundIndex = (this.soundIndex + 1) % this.popSounds.length;
      this.activePops++;
      
      sound.onended = () => this.activePops--;
    }
  }
}

export default Popcorns;

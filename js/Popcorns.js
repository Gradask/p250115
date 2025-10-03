import { camera, mode } from "./client.js";
import mat4helpers from "./mat4helpers.js";

class Popcorns {
  constructor(position, pointSize, texSize, PPI, modes) {
    this.all = [];
    this.popcorns = [];
    this.popcornsToDraw = [];
    this.distanceWinner = null;

    // Time
    this.maxTime = 60;
    this.rate = 1;
    this.elapsedTime = 0;
    this.kernelTime = 0;
    this.winnerTime = -1;
    this.lastime;
    this.baselineDeltaTime = 16.7; // 50 fps
    this.maxDeltaTime = 67; // ~15 fps
    
    // Physics
    this.gravity = 9.81 * 0.001;
    this.saucepanRadius = 170;
    this.saucepanHeight = 143 * 1.35;
    this.PPI = PPI; // pixels per inch
    this.frictionFactor = 0.98 * 0.75; // damping factor for xy movement on the ground
    this.velocityThreshold = 0.05; // minimum velocity below which motion stops
    
    // Renderables
    this.position = position;
    this.u_pointSize = pointSize;
    this.u_texSize = texSize;
    this.u_texture = 0;
    this.attribs = {
      a_position: { data: new Float32Array(500 * 3) },
      a_texcoord: { data: new Float32Array(500 * 2) },
    }
    this.count = 0;

    // Sound effect
    this.maxConcurrentPops = Infinity;
    this.activePops = 0;
    this.volume = 0.25;
    this.soundIndex = 0;
    this.popSounds = [
      "audio/pop1b2.wav",
      "audio/pop2b2.wav"
    ];
    this.popBuffers = [];
    this.gainPool = [];
    this.pannerPool = [];
    this.activeGainNodes = [];
    this.initSounds();

    this.modes = modes;
    this.isDirty = true;
    this.updateResults = false;
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
    this.copyArray(this.popcorns, this.all);

    this.shuffleArray(this.all);
    for (const popcorn of this.all) popcorn.reset(this.maxTime, this.elapsedTime);
    this.addSuspense();
    this.kernelCount = this.all.length;
    this.stoppedCount = 0;
    this.disappearedCount = 0;
    this.distanceWinner = null;
  }
  
  resetTime() {
    this.lastTime = performance.now();
    this.elapsedTime = 0;
    this.kernelTime = 0;
    this.winnerTime = -1;
  }
  
  resetModes() {
    for (const mode in this.modes) this.modes[mode].start();
    this.updateResults = false;
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
    this.all.sort((a, b) => a.popTime - b.popTime);
    const last = this.all[this.all.length - 1];
    const secondToLast = this.all[this.all.length - 2];
    const scaleFactor = this.maxTime/60 * 4; // 4 * 0.1, 0.5, 1, 2, 10
    if (!secondToLast) return;
    last.popTime += scaleFactor; 
    secondToLast.popTime += scaleFactor;
  }

  generateKernels(records) {
    this.copyArray(this.popcorns, records);
    this.copyArray(this.all, records);
    this.resetRenderables();
  }

  copyArray(a, b) {
    a.length = 0;
    for (let i = 0; i < b.length; i++) {
      a[i] = b[i];
    }
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
    this.popcornsToDraw.length = 0;

    for (let i = 0; i < this.popcorns.length; i++) {
      const popcorn = this.popcorns[i];

      if (mode === "time") {
        if (popcorn.state === "disappeared") {
          continue;
        } else if (popcorn.state === "kernel") {
          if (this.kernelCount > 1) this.updateKernel(popcorn);
          this.updateRenderables(popcorn);
          nameTags.updateRenderables(popcorn);
          if (this.updateResults) this.updateTimeResults();
          continue;
        } else if (popcorn.state === "popping") {
          this.updatePopping(popcorn, timeScale, deltaGravity);
        } else if (popcorn.state === "stopped") {
          this.updateStopped(popcorn);
          if (!popcorn.blinkState) continue;
        }
        this.popcornsToDraw.push(popcorn);
        if (this.updateResults) this.updateTimeResults();
      } else {
        if (popcorn.state === "kernel") {
          this.updateKernel(popcorn);
          this.updateRenderables(popcorn);
          nameTags.updateRenderables(popcorn);
          continue;
        } else if (popcorn.state === "popping") {
          this.updatePopping(popcorn, timeScale, deltaGravity);
        }
        this.popcornsToDraw.push(popcorn);
        if (this.updateResults) this.updateDistanceResults();
      }
    }

    //if (this.modes[mode].winner) this.jump(deltaTime, this.modes[mode].winner);
    
    for (let i = 0; i < this.popcornsToDraw.length; i++) {
      const popcorn = this.popcornsToDraw[i];
      this.updateRenderables(popcorn);
      nameTags.updateRenderables(popcorn);
    }
  }

  emptyRenderables() {
    this.count = 0;
  }

  updateRenderables(popcorn) {
    const i = this.count;

  this.attribs.a_position.data.set([
    popcorn.position[0],
    popcorn.position[1],
    popcorn.position[2]
  ], i * 3);
  this.attribs.a_position.isDirty = true;

  this.attribs.a_texcoord.data.set([
    popcorn.a_texcoord[0],
    popcorn.a_texcoord[1]
  ], i * 2);
  this.attribs.a_texcoord.isDirty = true;

  this.count++;
  }

  updateKernel(kernel) {
    if (kernel.popTime <= this.kernelTime) {
      kernel.pop(this.elapsedTime);
      this.playPop();
      this.kernelCount--;
    }
  }

  updatePopping(popcorn, deltaTime, deltaGravity) {
    popcorn.velocity[2] -= deltaGravity; // Apply gravity
      
    // Predict and check for collisions with cylinder
    if (popcorn.isInside && popcorn.position[2] <= this.saucepanHeight) {
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

        if (!this.distanceWinner || popcorn.radialDistance > this.distanceWinner.radialDistance) {
          this.distanceWinner = popcorn;
        }
        this.stoppedCount++;
        if (mode === "distance" && this.stoppedCount === this.all.length) this.updateResults = true;
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
        if (this.disappearedCount === this.all.length - 1) this.updateResults = true;
      }
    } else {
      popcorn.blinkState = true;
    }
  }

  updateTimeResults() {
    this.modes.time.winner = this.all[this.all.length - 1];
    this.modes.time.stop();
    this.updateResults = false;
  }

  updateDistanceResults() {
    this.modes.distance.winner = this.distanceWinner;
    this.modes.distance.stop();
    this.updateResults = false;
  }

  checkCollision(popcorn, deltaTime) {
    const rSquared = popcorn.position[0] ** 2 + popcorn.position[1] ** 2;
    
    this._tempVec3 = this._tempVec3 || [0, 0, 0];
    this._tempVec3[0] = popcorn.position[0] + popcorn.velocity[0] * deltaTime;
    this._tempVec3[1] = popcorn.position[1] + popcorn.velocity[1] * deltaTime;
    this._tempVec3[2] = popcorn.position[2] + popcorn.velocity[2] * deltaTime;

    const nextRSquared = this._tempVec3[0] ** 2 + this._tempVec3[1] ** 2;
  
    if (rSquared <= this.saucepanRadius ** 2 && nextRSquared > this.saucepanRadius ** 2 && popcorn.position[2] <= this.saucepanHeight) {
      const radialDistance = Math.sqrt(rSquared);
      const dx = this._tempVec3[0] - popcorn.position[0];
      const dy = this._tempVec3[1] - popcorn.position[1];
      const dz = this._tempVec3[2] - popcorn.position[2];
      const movementDistance = Math.sqrt(dx ** 2 + dy ** 2);
  
      if (movementDistance > 0) {
        const t = (this.saucepanRadius - radialDistance) / movementDistance;

        this._tempVec3[0] = popcorn.position[0] + dx * t;
        this._tempVec3[1] = popcorn.position[1] + dy * t;
        this._tempVec3[2] = popcorn.position[2] + dz * t;
  
        this._tempVec3[0] = this._tempVec3[0] / this.saucepanRadius;
        this._tempVec3[1] = this._tempVec3[1] / this.saucepanRadius;
        this._tempVec3[2] = 0;

        const velocityDotNormal = mat4helpers.dot(popcorn.velocity, this._tempVec3);
        popcorn.velocity[0] -= 2 * velocityDotNormal * this._tempVec3[0];
        popcorn.velocity[1] -= 2 * velocityDotNormal * this._tempVec3[1];
  
        popcorn.position[0] = this._tempVec3[0] * this.saucepanRadius;
        popcorn.position[1] = this._tempVec3[1] * this.saucepanRadius;
      }
    } else if (rSquared > this.saucepanRadius ** 2) {
      popcorn.isInside = false;
    }
  }

  async initSounds() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.popBuffers = await Promise.all(this.popSounds.map(file => this.loadSound(file)));
  }

  async loadSound(file) {
    try {
        const response = await fetch(file);
        if (!response.ok) throw new Error(`Failed to load: ${file}`);
  
        const arrayBuffer = await response.arrayBuffer();
  
        return new Promise((resolve, reject) => {
            this.audioContext.decodeAudioData(arrayBuffer, resolve, reject);
        });
    } catch (error) {
        console.error("Error loading sound:", error);
        return null;
    }
  }

    async initSounds() {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.popBuffers = await Promise.all(this.popSounds.map(file => this.loadSound(file)));
    }
  
    async loadSound(file) {
      try {
        const response = await fetch(file);
        if (!response.ok) throw new Error(`Failed to load: ${file}`);
  
        const arrayBuffer = await response.arrayBuffer();
  
        return new Promise((resolve, reject) => {
          this.audioContext.decodeAudioData(arrayBuffer, resolve, reject);
        });
      } catch (error) {
        console.error("Error loading sound:", error);
        return null;
      }
    }
  
    playPop() {
      if (this.activePops < this.maxConcurrentPops) {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.popBuffers[this.soundIndex];
  
        // Randomize pitch (playbackRate)
        source.playbackRate.value = 0.9 + Math.random() * 0.1;
  
        // Reuse or create a GainNode
        const gainNode = this.gainPool.length > 0
          ? this.gainPool.pop()
          : this.audioContext.createGain();
        gainNode.gain.value = this.volume * (0.9 + Math.random() * 0.2);
  
        // Reuse or create a StereoPannerNode
        const panner = this.pannerPool.length > 0
          ? this.pannerPool.pop()
          : this.audioContext.createStereoPanner();
        panner.pan.value = (Math.random() * 2 - 1) * 0.1;
  
        // Connect nodes: source -> panner -> gain -> destination
        source.connect(panner);
        panner.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
  
        // Track active GainNode for volume adjustments
        this.activeGainNodes.push(gainNode);
  
        source.start();
  
        this.soundIndex = (this.soundIndex + 1) % this.popBuffers.length;
        this.activePops++;
  
        source.onended = () => {
          this.activePops = Math.max(0, this.activePops - 1);
  
          // Remove the gain node from the active list
          const index = this.activeGainNodes.indexOf(gainNode);
          if (index > -1) {
            this.activeGainNodes.splice(index, 1);
          }
  
          // Disconnect nodes to allow proper cleanup
          try {
            source.disconnect();
          } catch (e) { }
          try {
            panner.disconnect();
          } catch (e) { }
          try {
            gainNode.disconnect();
          } catch (e) { }
  
          // Return nodes to their pools for reuse
          this.gainPool.push(gainNode);
          this.pannerPool.push(panner);
        };
      } else {
        this.lowerVolumeOfActiveSounds();
      }
    }
  
    lowerVolumeOfActiveSounds() {
      this.activeGainNodes.forEach(gainNode => {
        gainNode.gain.setTargetAtTime(
          gainNode.gain.value * 0.8,
          this.audioContext.currentTime,
          0.1
        );
      });
    }

  easeOutQuad(x) {
    return 1 - (1 - x) * (1 - x);
  }
}

export default Popcorns;

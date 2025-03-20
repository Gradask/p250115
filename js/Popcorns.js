import { camera, mode } from "./client.js";
import mat4helpers from "./mat4helpers.js";

class Popcorns {
  constructor(position, pointSize, texSize, PPI, modes) {
    this.all = [];
    this.popcorns = [];
    this.popcornsToDraw = [];

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
    this.maxConcurrentPops = 6;
    this.activePops = 0;
    this.volume = 0.25;
    this.soundIndex = 0;
    this.popSounds = [
        "audio/test2-4.wav"
    ];
     this.popBuffers = [];
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
    this.popcorns = [...this.all];
    this.shuffleArray(this.all);
    for (const popcorn of this.all) popcorn.reset(this.maxTime, this.elapsedTime);
    this.addSuspense();
    this.kernelCount = this.all.length;
    this.stoppedCount = 0;
    this.disappearedCount = 0;
  }
  
  resetTime() {
    this.lastTime = performance.now();
    this.elapsedTime = 0;
    this.kernelTime = 0;
    this.winnerTime = -1;
  }
  
  resetModes() {
    for (const mode in this.modes) this.modes[mode].reset();
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
    const scaleFactor = this.maxTime/60 * 2; // 2 * 0.1, 0.5, 1, 2, 10
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

    if (this.modes[mode].winner) this.jump(deltaTime, this.modes[mode].winner);
    
    for (let i = 0; i < this.popcornsToDraw.length; i++) {
      const popcorn = this.popcornsToDraw[i];
      this.updateRenderables(popcorn);
      nameTags.updateRenderables(popcorn);
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
    this.attribs.a_worldOffset.isDirty = true;

    this.attribs.a_color.data.push(
      popcorn.color[0],
      popcorn.color[1],
      popcorn.color[2],
    );
    this.attribs.a_color.isDirty = true;

    this.attribs.a_position.data.push(
      popcorn.position[0],
      popcorn.position[1],
      popcorn.position[2]
    );
    this.attribs.a_position.isDirty = true;

    this.attribs.a_texcoord.data.push(
      popcorn.a_texcoord[0],
      popcorn.a_texcoord[1]
    );
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
  }

  updateDistanceResults() {
    let final = [...this.popcorns];
    final.sort((a, b) => b.radialDistance - a.radialDistance);
    this.modes.distance.winner = final[0];
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
    } else if (rSquared > this.saucepanRadius ** 2) {
      popcorn.isInside = false;
    }
  }

  playPop() {
    if (this.activePops < this.maxConcurrentPops) {
      const sound = this.popSounds[this.soundIndex];
      sound.currentTime = 0;
      sound.volume = this.volume;
      sound.play();
      
      this.soundIndex = (this.soundIndex + 1) % this.popSounds.length;
      this.activePops++;
      
      sound.onended = () => this.activePops--;
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
      source.playbackRate.value = 0.9 + Math.random() * 0.2;

      // Handle volume with GainNode
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = this.volume * (0.9 + Math.random() * 0.2);

      // Spread audio with StereoPannerNod
      const panner = this.audioContext.createStereoPanner();
      panner.pan.value = (Math.random() * 2 - 1) * 0.1;
      //panner.pan.value = 0;
      // Connect nodes
      source.connect(panner);
      panner.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start();

      this.soundIndex = (this.soundIndex + 1) % this.popBuffers.length;
      this.activePops++;

      source.onended = () => {
          this.activePops = Math.max(0, this.activePops - 1);
      };
    } else {
      this.lowerVolumeOfActiveSounds();
    }
  }

  lowerVolumeOfActiveSounds() {
    this.audioContext.destination.children?.forEach(node => {
      if (node instanceof GainNode) {
          node.gain.setTargetAtTime(node.gain.value * 0.8, this.audioContext.currentTime, 0.1);
      }
    });
  }

  easeOutQuad(x) {
    return 1 - (1 - x) * (1 - x);
  }

  jump(deltaTime, popcorn) {
    this.winnerTime += deltaTime / 1000;
    if (this.winnerTime < 0) return;

    const dur = 0.5;          
    const pause = 1;
    const height = 50;

    let t = Math.min(this.winnerTime / dur, 1); // Clamp dt
    const easedT = this.easeOutQuad(1 - Math.abs(2 * t - 1));
    const step = easedT * height;

    if (!popcorn.basePosition) popcorn.basePosition = [...popcorn.position];
      popcorn.baseScreenPosition = mat4helpers.worldToScreen(popcorn.basePosition.map(p => p / 60), camera.vpMat, camera.width, camera.height);
      popcorn.topSide = popcorn.baseScreenPosition[1] < camera.height/2;
      
    if (mode === "time") {
      if (popcorn.topSide) {
        this.screenJump(popcorn, step, 0.3);
      } else {
        this.slideJump(popcorn, step, 0.2);
      }
    }

    if (mode === "distance") {
      if (popcorn.radialDistance <= this.saucepanRadius) {
        this.worldJump(popcorn, step, 0.7);
      } else {
        if (popcorn.topSide) {
          this.slideJump(popcorn, step, 0.6);
        } else {
          this.screenJump(popcorn, step, 0.35);
        }
      }
    }

    if (this.winnerTime > dur + pause) this.winnerTime = 0;
  }

  worldJump(popcorn, step, scale = 1) {
    // Translation in world space
    popcorn.position[2] = step * scale;
  }

  screenJump(popcorn, step, scale = 1) {
    // Translation in screen space. Depth not preserved. Popcorn is always drawn in the front.
    const newScreenPosition = [popcorn.baseScreenPosition[0], popcorn.baseScreenPosition[1] - step * scale];
    popcorn.position = mat4helpers.screenToWorld(newScreenPosition, camera.vpMat, camera.width, camera.height).map(p => p * 60);
  }

  slideJump(popcorn, step, scale = 1) {
    // Translation in world space based on camera's up vector. Depth preserved. Popcorn slides across the floor.
    const screenUp = [
      camera.vMat[1],  // u[0]
      camera.vMat[5],  // u[1]
      camera.vMat[9]   // u[2]
    ];

    popcorn.position[0] = popcorn.basePosition[0] + screenUp[0] * step * scale;
    popcorn.position[1] = popcorn.basePosition[1] + screenUp[1] * step * scale;
    popcorn.position[2] = popcorn.basePosition[2] + screenUp[2] * step * scale;
  }
}

export default Popcorns;

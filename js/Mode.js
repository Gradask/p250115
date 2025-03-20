class Mode {
  constructor(type) {
    this.type = type;
    this.reset();
  }

  reset() {
    this.results = "";
    this.winner = null;
  }

  start() {
    this.reset();
    this.isRunning = true;
  }

  stop() {
    this.isRunning = false;
  }
}

export default Mode;

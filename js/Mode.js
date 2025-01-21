class Mode {
  constructor(type) {
    this.type = type;
    this.reset();
  }

  reset() {
    this.isRunning = true;
    this.results = "";
    this.winner = null;
  }

  stop() {
    this.isRunning = false;
  }
}

export default Mode;
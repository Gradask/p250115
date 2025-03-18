import fontInfo from '../font/font.js';
import Camera from './Camera.js';
import Mesh from './Mesh.js';
import NameTags from './NameTags.js';
import Popcorns from './Popcorns.js';
import { render, texRenderer } from './render.js';
import Popcorn from './Popcorn.js';
import Mode from './Mode.js';
import Target from './Target.js';

const modes = {
  time: new Mode("time"),
  distance: new Mode("distance")
};

let isRunning = false;
let shouldRender = false;
let showResults = true;
let mode = "time";
let records = [];
let pops = [];  

const PPI = 200/7;
const position = [0, 0, 0];
const camera = new Camera();

const meshId = "test3";
const bottomPlateId = "test3_plate";
const saucepan = new Mesh(position, meshId);
const bottomPlate = new Mesh(position, bottomPlateId);

const popcornPointSize = 32;
const popcornTexSize = [160, 64]
const popcorns = new Popcorns(position, popcornPointSize, popcornTexSize, PPI, modes);

const nameTagPointSize = 8;
const nameTagTexSize = [128, 80];
const nameTags = new NameTags(position, nameTagPointSize, nameTagTexSize, fontInfo);

const targetRadius = 35;
const numRings = 3;
const targetColors = [
  [143, 193, 143],
  [173, 223, 173]
]
let target = new Target(position, PPI, targetRadius, numRings, targetColors);

const init = () => {
  document.body.style.display = "block";
  
  // Buttons
  const btns = document.getElementById("button-container");
  const addBtn = document.getElementById("+");
  const settingsBtn = document.getElementById("settingsBtn")
  const timeBtn = document.getElementById("time");
  const distanceBtn = document.getElementById("distance");
  const startBtn = document.getElementById("start");

  // Input
  const inputContainer = document.getElementById("input-container");
  const input = document.getElementById("input");
  input.value = "";

  // Settings
  const settings = document.getElementById("settings");
  
  // Results
  const resultsContainer = document.getElementById('results');
  const winnerNameElement = document.getElementById('winner');
  const movieNameElement = document.getElementById('movie');
  const closeBtn = document.getElementById('closeBtn');

  closeBtn.addEventListener('click', () => hide(resultsContainer));
  btns.addEventListener("click", () => hide(resultsContainer));

  function positionMenus() {
    const addRect = addBtn.getBoundingClientRect();
    inputContainer.style.left = `${addRect.left + addRect.width / 2}px`;
    inputContainer.style.bottom = `${window.innerHeight - addRect.top + 10}px`;

    const settingsRect = settingsBtn.getBoundingClientRect();
    settings.style.left = `${settingsRect.left + settingsRect.width / 2}px`;
    settings.style.bottom = `${window.innerHeight - settingsRect.top + 10}px`;
  }

  positionMenus();

  timeBtn.addEventListener("click", () => {
    if (mode !== "time") {
      camera.time();
      camera.getMat();
      mode = "time";
      popcorns.switchMode("time");
      popcorns.reset();
      nameTags.resetRenderables(popcorns);
      select(timeBtn);
      deselect(distanceBtn);
      deselect(startBtn);
      pause();
      shouldRender = true;
    }
  });

  distanceBtn.addEventListener("click", () => {
    if (mode !== "distance") {
      camera.distance();
      camera.getMat();
      mode = "distance";
      popcorns.switchMode("distance");
      popcorns.reset();
      nameTags.resetRenderables(popcorns);
      select(distanceBtn);
      deselect(timeBtn);
      deselect(startBtn);
      pause();
      shouldRender = true;
    }
  });

  addBtn.addEventListener("click", () => {
    addBtn.classList.toggle("selected");
    inputContainer.classList.toggle("hidden");
    settings.classList.add("hidden");
    deselect(settingsBtn);
  });

  settingsBtn.addEventListener("click", () => {
    settingsBtn.classList.toggle("selected");
    settings.classList.toggle("hidden");
    inputContainer.classList.add("hidden");
    deselect(addBtn);
  });

  startBtn.addEventListener("click", () => {
    if (pops.length > 0) start();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") input.classList.toggle("hidden");
  });
  
  input.addEventListener("input", () => handleInput());

  settings.addEventListener("click", (event) => {
    if (event.target.tagName === "BUTTON") {
      const group = event.target.closest(".option-container");

      if (!group) return;

      const selected = group.querySelector(".selected");
      if (selected) deselect(selected);
      select(event.target);

      const setting = event.target.textContent;

      if (group.classList.contains("time-options")) {
        popcorns.updateMaxTime(setting);
      } else if (group.classList.contains("font-options")) {
        nameTags.updateSize(pops, setting, popcorns);
        shouldRender = true;
      }
    }
  });

  function start() {
    deselect(addBtn);
    deselect(settingsBtn);
    select(startBtn);
    hide(inputContainer);
    deselect(inputContainer);
    hide(settings);
    deselect(settings);
    showResults = true;
    popcorns.reset();
    resume();
  }

  window.addEventListener("resize", () => {
    shouldRender = true;
    positionMenus();
  });  
  
  const loop = (time) => {
    if (isRunning && popcorns.all.length > 0) {
      popcorns.update(time, nameTags);

      if (!modes[mode].isRunning) {
        if (showResults) {
          winnerNameElement.textContent = modes[mode].winner.name;
          movieNameElement.textContent = modes[mode].winner.movie;
          if (!modes[mode].winner || !modes[mode].winner.name) {
            console.log("winner error", modes[mode], popcorns);
          }
          show(resultsContainer);
          showResults = false;
          isRunning = false;
          shouldRender = true;
          deselect(startBtn);
        }
      }
    }

    if (texRenderer.isReady && saucepan.isDirty && bottomPlate.isDirty) {
      shouldRender = true;
    }
  
    if (isRunning || shouldRender) render(time);
    shouldRender = false;
    requestAnimationFrame(loop);
  };

  loop();
}

document.addEventListener('DOMContentLoaded', () => init());

function select(elem) {
  elem.classList.add("selected")
}

function deselect(elem) {
  elem.classList.remove("selected");
}

function hide(elem) {
  elem.classList.add("hidden");
}

function show(elem) {
  elem.classList.remove("hidden");
}

const pause = function() {
  isRunning = false;
}

const resume = function() {
  isRunning = true;
}

function handleInput() {
  const updatedRecords = parseInput(input.value);
  const names = updatedRecords.map(record => record.name);
  const popIdMap = new Map(pops.map(pop => [pop.id, pop]));
  const usedIds = new Set();

  const newPops = names.map((name, index) => {
    const foundPopcorn = findMatchingPopcorn(name, popIdMap, usedIds);
    return foundPopcorn || createOrUpdatePopcorn(name, index, records, pops);
  });

  pops.length = 0;
  pops.push(...newPops);
  
  popcorns.generateKernels(pops);
  nameTags.generateTags(pops, true);
  nameTags.resetRenderables(popcorns)
  records = names;
  updateMovie(pops, updatedRecords);
  shouldRender = true;
}

function parseInput(val) {
  const data = [];
  const records = val
    .split(/\r?\n/)
    .map(name => name.trim()
    .filter(name => name.length > 0);

  for (const record of records) {
    const separatorIndex = record.indexOf("\t") !== -1 ? record.indexOf("\t") : record.indexOf("-");

    if (separatorIndex !== -1) {
      const name = record.slice(0, separatorIndex).trim().replace(/\s+/g, " "); // Clean up name
      const movie = record.slice(separatorIndex + 1).trim().replace(/\s+/g, " "); // Clean up movie
      data.push({ name, movie });
    } else {
      data.push({ name: record, movie: null });
    }
  }
  return data;
}

function findMatchingPopcorn(name, popIdMap, usedIds) {
  for (const [id, pop] of popIdMap) {
    if (pop.name === name && !usedIds.has(id)) {
      usedIds.add(id);
      return pop;
    }
  }
  return null;
}

function createOrUpdatePopcorn(name, index, records, pops) {
  if (records[index]) {
    const existingPop = pops[index];
    existingPop.name = name;
    return existingPop;
  } else {
    return new Popcorn(name, 60);
  }
}

function updateMovie(pops, updatedRecords) {
  for (const popcorn of pops) {
    for (const record of updatedRecords) {
      if (popcorn.name === record.name) {
        popcorn.movie = record.movie;
      }
    }
  }
}

export { camera, saucepan, target, popcorns, nameTags, mode, bottomPlate };

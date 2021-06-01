// global variables undesirable, should improve
let CGOLObj, ctx;
let freq = 60, mult = 8;

function sample_dist() {
  // 0.2 bias to left
  return Math.random() - 0.2 >= 0.5 ? 1 : 0
}

class CGOL {

  constructor(w, h, f) {
    this.w = w;
    this.h = h;
    const { grid, livingCells } = CGOL.makeGrid(w, h);
    this.grid = grid;
    this.livingCells = livingCells;

    this.isStopped = false;
    this.isPaused = true;
    this.setFreq(f);

    for(let i = 0; i < h; i++) {
      for(let j = 0; j < w; j++) {
        ctx.fillStyle = this.grid[i][j]["alive"] ? "#fff" : "#000";
        ctx.fillRect(mult*j, mult*i, mult, mult);
      }
    }
  }

  setFreq(f) {
    this.frequency = f;
    this.msPeriod = 1000 / f;
  }

  start() {
    if(!this.isStopped) {
      this.step();
      this.print();
      window.requestAnimationFrame(this.loop.bind(this));
    }
  }

  stop() {
    this.isStopped = true;
  }

  loop(time) {
    if(this.isStopped) return;

    if(this.isPaused) {
      window.requestAnimationFrame(this.loop.bind(this));
      return;
    }

    if(!this.last) {
      this.last = time;
    }

    const elapsed = time - this.last;

    if(elapsed >= this.msPeriod) {
      this.last = time;
      this.step();
      this.print();
    }

    window.requestAnimationFrame(this.loop.bind(this));
  }
  
  play() {
    this.isPaused = false;
  }

  pause() {
    this.isPaused = true;
  }

  static makeGrid(w, h) {
    const grid = [], livingCells = [];
    let i, j, left, right, above, below;

    for(i = 0; i < h; i++) {
      grid.push([]);

      for(j = 0; j < w; j++) {
        grid[i][j] = {};
      }
    }

    for(i = 0; i < h; i++) {
      for(j = 0; j < w; j++) {
        left  = j - 1;
        right = j + 1;
        above = i - 1;
        below = i + 1;

        if(left  == -1) left = left + w;
        if(right ==  w) right = 0;
        if(above == -1) above = above + h;
        if(below ==  h) below = 0;

        grid[i][j]["x"] = j;
        grid[i][j]["y"] = i;
        grid[i][j]["alive"] = sample_dist();
        grid[i][j]["visited"] = false;
        grid[i][j]["neighbors"] = [
          grid[above][left], grid[above][  j  ], grid[above][right],
          grid[  i  ][left],                     grid[  i  ][right],
          grid[below][left], grid[below][  j  ], grid[below][right],
        ];

        if(grid[i][j]["alive"]) livingCells.push(grid[i][j]);
      }
    }

    return {
      "grid": grid,
      "livingCells": livingCells,
    };
  }

  set(x, y, state) {
    this.grid[y][x] = state ? 1 : 0;
  }

  step() {
    const diff = [], newLivingCells = [], visited = [];
    let livingNeighbor;
    let livingNeighborCount, subLivingNeighborCount;
    let i, j, k;

    // visit all unvisited living cells
    for(i = 0; i < this.livingCells.length; i++) {
      if(!this.livingCells[i]["visited"]) {
        this.livingCells[i]["visited"] = true;
        visited.push(this.livingCells[i]);

        // eval fate
        livingNeighborCount = 0;
        for(j = 0; j < 8; j++) {
          livingNeighborCount += this.livingCells[i]["neighbors"][j]["alive"];
        }
        if(livingNeighborCount != 2 && livingNeighborCount != 3) {
          diff.push(this.livingCells[i]);
        }
        else newLivingCells.push(this.livingCells[i]);
      }
      
      // visit each unvisited neighbor
      for(j = 0; j < 8; j++) {
        livingNeighbor = this.livingCells[i]["neighbors"][j];
        if(!livingNeighbor["visited"]) {
          livingNeighbor["visited"] = true;
          visited.push(livingNeighbor);

          // eval fate
          livingNeighborCount = 0;
          for(k = 0; k < 8; k++) {
            livingNeighborCount +=
              livingNeighbor["neighbors"][k]["alive"];
          }
          if(!livingNeighbor["alive"] && livingNeighborCount == 3) {
            diff.push(livingNeighbor);
            newLivingCells.push(livingNeighbor);
          }
          else if(livingNeighbor["alive"]
              && livingNeighborCount != 2
              && livingNeighborCount != 3) {
            diff.push(livingNeighbor);
          }
          else if(livingNeighbor["alive"]) {
            newLivingCells.push(livingNeighbor);
          }
        }
      }
    }

    // update and reset
    this.diff = diff;
    this.livingCells = newLivingCells;
    for(i = 0; i < this.diff.length; i++) {
      this.diff[i]["alive"] ^= 1;
    }
    for(i = 0; i < visited.length; i++) {
      visited[i]["visited"] = false;
    }
  }

  print() {
    for(let i = 0; i < this.diff.length; i++) {
      const x = this.diff[i]["x"], y = this.diff[i]["y"];
      ctx.fillStyle = this.diff[i]["alive"] ? "#fff" : "#000";
      ctx.fillRect(mult*x, mult*y, mult, mult);
    }
  }

}

// bad naming, class shares method of the same name
function start() {
  const w = Math.floor(document.documentElement.clientWidth / mult);
  const h = Math.floor(document.documentElement.clientHeight / mult);
  newCGOL(w, h, freq);
}

// can improve naming
function newCGOL(w, h, f) {
  if(CGOLObj !== undefined) CGOLObj.stop();

  CGOLObj = new CGOL(w, h, f);
  CGOLObj.start();
  CGOLObj.play();
}

function togglePlay() {
  if(g.isPaused) g.play();
  else g.pause();
}

function resizeCanvas() {
  canvas.width = (Math.floor(document.documentElement.clientWidth / mult)*mult).toString();
  canvas.height = (Math.floor(document.documentElement.clientHeight / mult)*mult).toString();
}

window.onload = () => {
  canvas = document.getElementById("disp");
  ctx = canvas.getContext("2d");

  resizeCanvas();

  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.fillText("click me",
                document.documentElement.clientWidth / 2 - 64,
                document.documentElement.clientHeight / 2); 

  window.addEventListener("resize", resizeCanvas, false);
  canvas.addEventListener("click", start, false);
};

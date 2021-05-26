// only draw list of diffs (update diffs)
// keep track of living cells, and eval their neighbors

const mult = 6;
const freq = 30;

var g, ctx;

// Box-Muller (other dists?)
function randn_bm() {
  var u = 1 - Math.random(), v = 1 - Math.random();
  return Math.abs((Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v ) + 3.5) / 7);
}


// these versions of add and sub work if only add/sub 1
// saves a little bit of time
class Galois1 {
  
  static add(a, b, n) {
    const sum = a + b;
    return sum == n ? 0 : sum; // for b = 1
    //return (a + b) % n; // for all b
  }

  static sub(a, b, n) {
    const diff = a - b;
    return diff == -1 ? diff + n : diff; // for b = 1
    //return diff < 0 ? (diff % n) + n : diff; // for all b
  }
  
}

class Game {

  constructor(w, h, f) { // f is frequency; add window.requestAnimationFrame
    const { grid, living } = Game.makeGrid(w, h);
    this.grid = grid;
    this.living = living;
    this.toVisit = Game.findToVisit(this.grid, this.living);
    this.diffCells = {};  // ['x']['y']

    this.isStopped = false;
    this.isPaused = true;
    this.setFreq(f);

    for(let j = 0; j < h; j++) { // y
      for(let i = 0; i < w; i++) { // x
        const cellState = this.grid[j][i];
        ctx.fillStyle = !cellState ? "black" : "white";
        ctx.fillRect(mult*i, mult*j, mult, mult);
      }
    }
  }

  setFreq(f) {
    this.frequency = f;
    this.msPeriod = 1000 / f;
  }

  start() {
    this.step();
    this.print();
    window.requestAnimationFrame(this.loop.bind(this));
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

  static findToVisit(grid, living) {
    const h = grid.length;
    const w = grid[0].length;
    const visitMap = {};
    const toVisit = [];

    for(let i = 0; i < living.length; i++) {
      const cell = living[i];
      const x = cell[0], y = cell[1];

      // partial neighbor indices
      const left =  Galois1.sub(x, 1, w);
      const right = Galois1.add(x, 1, w);
      const above = Galois1.sub(y, 1, h);
      const below = Galois1.add(y, 1, h);

      const indices = [
        [left, above], [x, above], [right, above],
        [left,   y  ], [x,   y  ], [right,   y  ],
        [left, below], [x, below], [right, below]
      ];

      // only push indices not yet seen
      indices.forEach(j => {
        if(!visitMap[j[1]]) {
          visitMap[j[1]] = {};
          visitMap[j[1]][j[0]] = true;
          toVisit.push(j);
        }
        
        else if(!visitMap[j[1]][j[0]]) {
          visitMap[j[1]][j[0]] = true;
          toVisit.push(j);
        }
      });
    }
    
    return toVisit;
  }

  static makeGrid(w, h) {
    const grid = [];
    const living = [];

    for(let j = 0; j < h; j++) { // y
      grid.push([]);
      for(let i = 0; i < w; i++) { // x
        grid[j][i] = randn_bm() - 0.1 >= 0.5 ? 1 : 0;
        if(grid[j][i]) {
          living.push([i, j]);
        }
      }
    }

    return {
      'grid': grid,
      'living': living,
    };
  }
  
  // assumes valid grid to avoid cycles
  // sum neighbor values
  static getLivingNeighbors(grid, x, y) {
    const h = grid.length;
    const w = grid[0].length;

    // partial neighbor indices
    const left =  Galois1.sub(x, 1, w);
    const right = Galois1.add(x, 1, w);
    const above = Galois1.sub(y, 1, h);
    const below = Galois1.add(y, 1, h);

    // neighbor sum
    return  grid[above][left] + grid[above][x]  + grid[above][right]
          + grid[  y  ][left]                   + grid[  y  ][right]
          + grid[below][left] + grid[below][x]  + grid[below][right];
  }

  set(x, y, state) {
    this.grid[y][x] = state ? 1 : 0;
  }

  static getDiff(grid, toVisit) {
    let diff = [];
    let living = [];
    
    for(let i = 0; i < toVisit.length; i++) {
      const cell = toVisit[i];
      const x = cell[0], y = cell[1];

      const cellState = grid[y][x];
      const livingNeighbors = Game.getLivingNeighbors(grid, x, y);

      const update = (livingNeighbors == 3)
        || (cellState && (livingNeighbors == 2 || livingNeighbors == 3))
        ? 1 : 0;

      if(update) {
        living.push([x, y]);
      }

      if(grid[y][x] !== update) {
        diff.push([x, y, update]);
      }
    }
    
    return {
      'diff': diff,
      'living': living,
    };
  }

  step() {
    const toVisit = Game.findToVisit(this.grid, this.living);
    const { diff, living } = Game.getDiff(this.grid, toVisit);
    this.diffCells = diff;
    this.living = living;


    for(let i = 0; i < diff.length; i++) {
      const x = diff[i][0], y = diff[i][1];
      this.grid[y][x] = diff[i][2];
    }
  }

  print() {
    for(let i = 0; i < this.diffCells.length; i++) {
      const x = this.diffCells[i][0], y = this.diffCells[i][1];
      const cellState = this.grid[y][x];
      ctx.fillStyle = !cellState ? "black" : "white";
      ctx.fillRect(mult*x, mult*y, mult, mult);
    }
  }

  example() {
    this.set(1, 0, 1);
    this.set(2, 1, 1);
    this.set(2, 2, 1);
    this.set(1, 2, 1);
    this.set(0, 2, 1);
  }

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
  ctx.fillText("click somewhere",
                document.documentElement.clientWidth / 2 - 128,
                document.documentElement.clientHeight / 2); 

  window.addEventListener("resize", resizeCanvas, false);
  canvas.addEventListener("click", start, false);
};

function newGame(w, h, f) {
  if(g !== undefined) g.stop();

  g = new Game(w, h, f);
  g.start();
  g.play();
}

function togglePlay() {
  if(g.isPaused) g.play();
  else g.pause();
}

function start() {
  newGame(Math.floor(document.documentElement.clientWidth / mult), Math.floor(document.documentElement.clientHeight / mult), 60);
}

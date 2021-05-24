// only draw list of diffs (update diffs)
// keep track of living cells, and eval their neighbors

const mult = 8;

var playing = false;
var g;
var ctx;

function randn_bm() {
  var u = 1 - Math.random(), v = 1 - Math.random();
  return Math.abs((Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v ) + 3.5) / 7);
}


class Galois {
  
  static add(a, b, n) {
    return (a + b) % n;
  }

  static sub(a, b, n) {
    const diff = a - b;
    return diff < 0 ? (diff % n) + n : diff;
  }
  
}

class Game {

  constructor(w, h, f) { // f is frequency; add window.requestAnimationFrame
    const freshGrid = Game.makeGrid(w, h);
    this.grid = freshGrid['grid'];
    this.living = freshGrid['living'];
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
    let toVisit = {};

    for(const ky in living) {
      for(const kx in living[ky]) {
        const y = parseInt(ky);
        const x = parseInt(kx);

        // partial neighbor indices
        const left =  Galois.sub(x, 1, w);
        const right = Galois.add(x, 1, w);
        const above = Galois.sub(y, 1, h);
        const below = Galois.add(y, 1, h);

        const indices = [
          [left, above], [x, above], [right, above],
          [left, y    ], [x, y    ], [right, y    ],
          [left, below], [x, below], [right, below]
        ];

        indices.forEach(i => {
          if(!toVisit[i[1]]) {
            toVisit[i[1]] = {};
          }

          toVisit[i[1]][i[0]] = true;
        });
      }
    }
    
    return toVisit;
  }

  static makeGrid(w, h) {
    const grid = [];
    const living = {};

    for(let j = 0; j < h; j++) { // y
      grid.push([]);
      for(let i = 0; i < w; i++) { // x
        grid[j][i] = randn_bm() - 0.1 >= 0.5 ? 1 : 0;
        if(grid[j][i]) {
          if(!living[j]) {
            living[j] = {};
          }
          living[j][i] = true;
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
    const left =  Galois.sub(x, 1, w);
    const right = Galois.add(x, 1, w);
    const above = Galois.sub(y, 1, h);
    const below = Galois.add(y, 1, h);

    // neighbor sum
    return  grid[above][left] + grid[above][x]  + grid[above][right]
          + grid[  y  ][left]                   + grid[  y  ][right]
          + grid[below][left] + grid[below][x]  + grid[below][right];
  }

  set(x, y, state) {
    this.grid[y][x] = state ? 1 : 0;
  }

  static getDiff(grid, toVisit) {
    let diff = {};
    let living = {};
    
    for(const ky in toVisit) {
      for(const kx in toVisit[ky]) {
        const y = parseInt(ky);
        const x = parseInt(kx);

        const cellState = grid[y][x];
        const livingNeighbors = Game.getLivingNeighbors(grid, x, y);

        const update = (livingNeighbors == 3)
          || (cellState && (livingNeighbors == 2 || livingNeighbors == 3))
          ? 1 : 0;

        if(update) {
          if(!living[y]) {
            living[y] = {};
          }
          living[y][x] = true;
        }

        if(grid[y][x] !== update) {
          if(!diff[y]) {
            diff[y] = {};
          }
          diff[y][x] = update;
        }
      }
    }
    
    return {
      'diff': diff,
      'living': living,
    };
  }

  step() {
    const toVisit = Game.findToVisit(this.grid, this.living);
    const freshDiff = Game.getDiff(this.grid, toVisit);
    this.diffCells = freshDiff['diff'];
    this.living = freshDiff['living'];


    for(const y in this.diffCells) {
      for(const x in this.diffCells[y]) {
        this.grid[y][x] = this.diffCells[y][x];
      }
    }
  }

  print() {
    for(const ky in this.diffCells) {
      for(const kx in this.diffCells[ky]) {
        const y = parseInt(ky);
        const x = parseInt(kx);

        const cellState = this.grid[ky][kx];
        ctx.fillStyle = !cellState ? "black" : "white";
        ctx.fillRect(mult*x, mult*y, mult, mult);
      }
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

  window.addEventListener("resize", resizeCanvas, false);
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

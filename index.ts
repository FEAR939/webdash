import os from "os";
import bun from "bun";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
const app = new Hono();

//Create function to get CPU information
function cpuAverage() {
  //Initialise sum of idle and time of cores and fetch CPU info
  var totalIdle = 0,
    totalTick = 0;
  var cpus = os.cpus();

  //Loop through CPU cores
  for (var i = 0, len = cpus.length; i < len; i++) {
    //Select CPU core
    var cpu = cpus[i];

    //Total up the time in the cores tick
    for (let type in cpu.times) {
      totalTick += cpu.times[type];
    }

    //Total up the idle time of the core
    totalIdle += cpu.times.idle;
  }

  //Return the average Idle and Tick times
  return { idle: totalIdle / cpus.length, total: totalTick / cpus.length };
}

// function to calculate average of array
const arrAvg = function (arr) {
  if (arr && arr.length >= 1) {
    const sumArr = arr.reduce((a, b) => a + b, 0);
    return sumArr / arr.length;
  }
};

// load average for the past 1000 milliseconds calculated every 100
function getCPULoadAVG(avgTime = 1000, delay = 100) {
  return new Promise((resolve, reject) => {
    const n = ~~(avgTime / delay);
    if (n <= 1) {
      reject("Error: interval to small");
    }

    let i = 0;
    let samples = [];
    const avg1 = cpuAverage();

    let interval = setInterval(() => {
      if (i >= n) {
        clearInterval(interval);
        resolve(~~(arrAvg(samples) * 100));
      }

      const avg2 = cpuAverage();
      const totalDiff = avg2.total - avg1.total;
      const idleDiff = avg2.idle - avg1.idle;

      samples[i] = 1 - idleDiff / totalDiff;

      i++;
    }, delay);
  });
}

function getMem() {
  return os.totalmem() - os.freemem();
}

let sysutil = { cpu: 0, mem: 0 };

async function loop() {
  sysutil.cpu = await getCPULoadAVG(1000, 100);
  sysutil.mem = ~~(getMem() / 1024 / 1024);
  setTimeout(loop, 1000);
}

loop();

app.get("/getutil", async (c) => {
  return c.json(sysutil);
});

app.get("/gettotalmem", (c) => {
  return c.json({ total: ~~(os.totalmem() / 1024 / 1024) });
});

app.get("/gethostname", (c) => {
  return c.text(os.hostname());
});

app.get("/", serveStatic({ path: "./frontend/index.html" }));
app.use(
  "*",
  cors({
    origin: "*",
  }),
);

bun.serve({
  port: 3000,
  fetch: app.fetch,
});

#!/usr/local/bin/node
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const io = require('socket.io-client');
const program = require('commander');

program
  .version('0.0.1')
  .usage('[options] <url>')
  .option('-s, --server <server>', 'Socket server url')
  .option('-t, --threads <n>', 'Number of threads to use (total = clients * threads), default number of cores', parseInt)
  .option('-c, --clients <n>', 'Number of clients to spin up, default 10', _ => {
    console.log({_});
    return parseInt(_);
  }, 10)
  .parse(process.argv);
program.url = program.args[program.args.length - 1];
program.threads = program.threads || Math.min(numCPUs, program.threads);
program.clients = program.clients || 10;


function runIt(n) {
  const client = io(program.server);
  client.clientNumber = n;
  client.responses = 0;
  client.on(program.url, (m) => {
    client.responses++;
    console.log(`Client ${client.clientNumber} response recieved, count ${client.responses}`)
  });
  client.emit('subscribe', {url:program.url,interval:2000});
}

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running. ${program.threads} threads with ${program.clients} clients each`);
  for (let i = 0; i < program.threads; i++) {
    cluster.fork({WORKER_ID:i});
  }
  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
}
else {
  for (let i = 0; i < program.clients; i++)
    runIt(process.env.WORKER_ID + "_" + i);
  console.log(`Worker ${process.env.WORKER_ID} (PID ${process.pid}) started`);
}
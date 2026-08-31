// PM2 config for a RAM-limited server (built for a 1GB box). Run with: pm2 start ecosystem.config.js
//
// Everything here is deliberately conservative:
// - instances: 1 + exec_mode: 'fork' -> exactly ONE copy of the server process. PM2's cluster mode
//   (instances: 'max' or > 1) runs several FULLY SEPARATE Node processes, each with its own memory,
//   its own V8 heap, its own MongoDB connection pool - it multiplies RAM use per copy, it does not
//   share it. On a 1GB server that's the single fastest way to run out of memory. One process is
//   the correct choice here and comfortably handles this app's traffic.
// - max_memory_restart: if the process ever balloons past this (a leak, a bad request, anything
//   unexpected), PM2 kills and restarts it automatically BEFORE it can eat the whole server and take
//   down everything else running on the box. A clean restart (a few seconds of downtime) is much
//   better than the OS's own out-of-memory killer choosing what to kill.
// - --max-old-space-size caps how big Node's own JS heap is allowed to grow, as a second safety net
//   under the PM2 limit above - without it Node sizes its heap ceiling off total system RAM, which on
//   a small box can let a single bad spike get much larger before anything intervenes.
module.exports = {
    apps: [{
        name: 'uniacademy-api',
        script: 'server.js',
        instances: 1,
        exec_mode: 'fork',
        max_memory_restart: '450M',
        node_args: '--max-old-space-size=460',
        env: { NODE_ENV: 'production' },
        // keeps the last restarts' worth of logs on disk instead of growing forever - disk is fine
        // per your own setup, this is just tidiness
        max_restarts: 10,
        min_uptime: '10s',
    }],
}

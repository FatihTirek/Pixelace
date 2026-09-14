#!/usr/bin/env node

/**
 * MULTI-CORE CLUSTER PRODUCTION SIMULATOR
 * Spawns multiple Node.js worker processes across all available CPU cores.
 * Each worker manages an isolated pool of WebSocket clients to bypass
 * single-threaded V8 event-loop bottlenecks.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import cluster from 'cluster';
import os from 'os';
import { performance } from 'perf_hooks';

const numCPUs = Math.min(os.cpus().length, 6); // Use up to 6 worker cores, leaving 2 cores for Backend & Redis!

const args = process.argv.slice(2);
function getArg(name, def) {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
}

const targetUrl = getArg('url', 'https://localhost:7296').replace(/\/+$/, '');
const totalTargetUsers = parseInt(getArg('users', '3000'), 10);
const durationSec = parseInt(getArg('duration', '10'), 10);
const adminSecret = getArg('secret', 'pixelace-admin-secret-dev');

if (cluster.isPrimary) {
    console.log('\n' + '='.repeat(85));
    console.log(`🚀 PIXELACE MULTI-CORE CLUSTER EXTREME STRESS TEST`);
    console.log('='.repeat(85));
    console.log(`🎯 Target URL        : ${targetUrl}`);
    console.log(`💻 Host CPU Cores    : ${os.cpus().length} Cores (Allocating ${numCPUs} Worker Processes)`);
    console.log(`👥 Target Total CCU  : ${totalTargetUsers.toLocaleString()} concurrent WebSocket clients`);
    console.log(`⏱️ Duration          : ${durationSec} seconds`);
    console.log(`📦 Protocol           : Pure 4-Byte Binary via SignalR MessagePack`);
    console.log('='.repeat(85) + '\n');

    // Reset cooldown to 0 for load test
    try {
        await fetch(`${targetUrl}/api/admin/cooldown?seconds=0`, {
            method: 'POST',
            headers: { 'X-Admin-Secret': adminSecret }
        });
        console.log('⚙️ Server cooldown set to 0s for extreme stress.');
    } catch {}

    const usersPerWorker = Math.floor(totalTargetUsers / numCPUs);
    console.log(`⚡ Spawning ${numCPUs} worker processes (~${usersPerWorker} bots per worker core)...\n`);

    const workerStats = [];
    let workersReady = 0;
    const startTime = performance.now();

    for (let i = 0; i < numCPUs; i++) {
        const worker = cluster.fork({
            WORKER_INDEX: i,
            USERS_COUNT: usersPerWorker,
            TARGET_URL: targetUrl,
            DURATION_SEC: durationSec
        });

        worker.on('message', (msg) => {
            if (msg.type === 'READY') {
                workersReady++;
                if (workersReady === numCPUs) {
                    console.log(`\n🔥 All ${numCPUs} workers connected! Commencing ${durationSec}s full blast traffic...`);
                    for (const id in cluster.workers) {
                        cluster.workers[id].send({ type: 'START_FIRE' });
                    }
                }
            } else if (msg.type === 'DONE') {
                workerStats.push(msg.data);
                if (workerStats.length === numCPUs) {
                    summarizeResults(workerStats, performance.now() - startTime);
                }
            }
        });
    }

    function summarizeResults(stats, totalDurationMs) {
        const totalConnected = stats.reduce((acc, s) => acc + s.connected, 0);
        const totalWrites = stats.reduce((acc, s) => acc + s.pixelsPlaced, 0);
        const totalBroadcasts = stats.reduce((acc, s) => acc + s.broadcastsRecv, 0);
        const totalErrors = stats.reduce((acc, s) => acc + s.errors, 0);
        const allLatencies = stats.flatMap(s => s.latencies).sort((a, b) => a - b);

        const count = allLatencies.length;
        const p50 = count ? allLatencies[Math.floor(count * 0.5)].toFixed(2) : 0;
        const p95 = count ? allLatencies[Math.floor(count * 0.95)].toFixed(2) : 0;
        const p99 = count ? allLatencies[Math.floor(count * 0.99)].toFixed(2) : 0;
        const avg = count ? (allLatencies.reduce((a, b) => a + b, 0) / count).toFixed(2) : 0;
        const max = count ? allLatencies[count - 1].toFixed(2) : 0;
        const throughput = (totalWrites / durationSec).toFixed(1);

        console.log('\n' + '='.repeat(85));
        console.log('🏆 MULTI-CORE EXTREME STRESS TEST FINAL REPORT');
        console.log('='.repeat(85));
        console.table([
            { 'Metric': 'Active Cluster Worker Processes', 'Value': `${numCPUs} Workers` },
            { 'Metric': 'Total Active WebSocket Connections (CCU)', 'Value': totalConnected.toLocaleString() },
            { 'Metric': 'Total Pixels Placed (Database Writes)', 'Value': totalWrites.toLocaleString() },
            { 'Metric': 'Total Real-Time Broadcasts Delivered', 'Value': totalBroadcasts.toLocaleString() },
            { 'Metric': 'Global Write Throughput (RPS)', 'Value': `${throughput} req/sec` },
            { 'Metric': 'Global Success Rate', 'Value': `${(((totalWrites) / (totalWrites + totalErrors || 1)) * 100).toFixed(2)}%` },
            { 'Metric': 'Average Latency (Network + Server)', 'Value': `${avg} ms` },
            { 'Metric': 'Median Latency (p50)', 'Value': `${p50} ms` },
            { 'Metric': '95th Percentile Latency (p95)', 'Value': `${p95} ms` },
            { 'Metric': '99th Percentile Latency (p99)', 'Value': `${p99} ms` },
            { 'Metric': 'Max Latency', 'Value': `${max} ms` }
        ]);
        console.log('='.repeat(85) + '\n');
        process.exit(0);
    }

} else {
    // ---------------- WORKER PROCESS LOGIC ----------------
    import('../Frontend/node_modules/@microsoft/signalr/dist/cjs/index.js').then(async ({ default: signalR }) => {
        const { default: msgpack } = await import('../Frontend/node_modules/@microsoft/signalr-protocol-msgpack/dist/cjs/index.js');
        
        const workerIdx = parseInt(process.env.WORKER_INDEX, 10);
        const usersCount = parseInt(process.env.USERS_COUNT, 10);
        const url = process.env.TARGET_URL;
        const durationSec = parseInt(process.env.DURATION_SEC, 10);

        const clients = [];
        let broadcastsRecv = 0;
        let pixelsPlaced = 0;
        let errors = 0;
        const latencies = [];

        // Connect batch
        const batchSize = 40;
        for (let i = 0; i < usersCount; i += batchSize) {
            const batch = [];
            for (let j = i; j < Math.min(i + batchSize, usersCount); j++) {
                const userId = `cluster_${workerIdx}_bot_${j}`;
                const conn = new signalR.HubConnectionBuilder()
                    .withUrl(`${url}/hub/canvas?userId=${encodeURIComponent(userId)}`, {
                        skipNegotiation: false,
                        transport: signalR.HttpTransportType.WebSockets
                    })
                    .withHubProtocol(new msgpack.MessagePackHubProtocol())
                    .configureLogging(signalR.LogLevel.None)
                    .build();

                conn.on('ReceivePixel', () => { broadcastsRecv++; });
                batch.push(conn.start().then(() => conn).catch(() => null));
            }

            const connected = await Promise.all(batch);
            connected.forEach(c => { if (c) clients.push(c); });
            await new Promise(r => setTimeout(r, 20));
        }

        process.send({ type: 'READY', connected: clients.length });

        process.on('message', async (msg) => {
            if (msg.type === 'START_FIRE') {
                let isRunning = true;

                function packPixel(canvasIndex, colorIndex) {
                    const buf = new Uint8Array(4);
                    buf[0] = (canvasIndex >> 16) & 0xFF;
                    buf[1] = (canvasIndex >> 8) & 0xFF;
                    buf[2] = canvasIndex & 0xFF;
                    buf[3] = colorIndex & 0xFF;
                    return buf;
                }

                const workers = clients.map(async (client) => {
                    await new Promise(r => setTimeout(r, Math.random() * 800));
                    while (isRunning) {
                        const canvasIndex = Math.floor(Math.random() * 1000000);
                        const colorIndex = Math.floor(Math.random() * 32);
                        const payload = packPixel(canvasIndex, colorIndex);

                        const t0 = performance.now();
                        try {
                            await client.invoke('SendPixel', payload);
                            latencies.push(performance.now() - t0);
                            pixelsPlaced++;
                        } catch {
                            errors++;
                        }
                        await new Promise(r => setTimeout(r, 250 + Math.random() * 500));
                    }
                });

                await new Promise(r => setTimeout(r, durationSec * 1000));
                isRunning = false;
                await Promise.all(workers);

                // Cleanup
                await Promise.all(clients.map(c => c.stop().catch(() => {})));

                process.send({
                    type: 'DONE',
                    data: {
                        connected: clients.length,
                        pixelsPlaced,
                        broadcastsRecv,
                        errors,
                        latencies
                    }
                });
            }
        });
    });
}

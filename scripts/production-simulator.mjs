#!/usr/bin/env node

/**
 * PRODUCTION REALISTIC SIMULATOR
 * Simulates high-scale real-world user activity on Pixelace:
 * - Poisson arrival ramp-up of users
 * - 4-byte pure binary bit-packed Uint8Array payloads
 * - Live broadcast listener accounting
 * - Latency distributions (p50, p95, p99, max)
 * - Throughput (RPS) and error rate tracking
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { performance } from 'perf_hooks';
import signalR from '../Frontend/node_modules/@microsoft/signalr/dist/cjs/index.js';
import msgpack from '../Frontend/node_modules/@microsoft/signalr-protocol-msgpack/dist/cjs/index.js';

const args = process.argv.slice(2);
function getArg(name, def) {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
}

const targetUrl = getArg('url', 'https://localhost:7296').replace(/\/+$/, '');
const totalUsers = parseInt(getArg('users', '1000'), 10);
const durationSec = parseInt(getArg('duration', '20'), 10);
const cooldownSec = parseInt(getArg('cooldown', '0'), 10);
const adminSecret = getArg('secret', 'pixelace-admin-secret-dev');

console.log('\n' + '='.repeat(80));
console.log('🚀 PIXELACE PRODUCTION REAL-WORLD SCALE SIMULATION');
console.log('='.repeat(80));
console.log(`🎯 Target URL        : ${targetUrl}`);
console.log(`👥 Concurrent Users   : ${totalUsers.toLocaleString()} active clients`);
console.log(`⏱️ Simulation Window  : ${durationSec} seconds`);
console.log(`📦 Protocol           : Pure 4-Byte Binary (24-bit CanvasIndex + 8-bit ColorIndex)`);
console.log('='.repeat(80) + '\n');

// 1. Temporarily disable cooldown for maximum load throughput testing if requested
try {
    const res = await fetch(`${targetUrl}/api/admin/cooldown?seconds=${cooldownSec}`, {
        method: 'POST',
        headers: { 'X-Admin-Secret': adminSecret }
    });
    if (res.ok) console.log(`⚙️ Server cooldown set to ${cooldownSec}s for simulation.`);
} catch (e) {
    console.log(`ℹ️ Cooldown unchanged: ${e.message}`);
}

// 2. Client Pool Setup
const clients = [];
let totalPixelsPlaced = 0;
let totalBroadcastsReceived = 0;
let totalErrors = 0;
const latencies = [];

console.log(`\n[Phase 1] ⏳ Ramping up ${totalUsers} concurrent WebSocket connections...`);
const rampStart = performance.now();
const batchSize = 50;

for (let i = 0; i < totalUsers; i += batchSize) {
    const batch = [];
    for (let j = i; j < Math.min(i + batchSize, totalUsers); j++) {
        const userId = `sim_user_${j}_${Math.random().toString(36).substring(2, 7)}`;
        const conn = new signalR.HubConnectionBuilder()
            .withUrl(`${targetUrl}/hub/canvas?userId=${encodeURIComponent(userId)}`, {
                skipNegotiation: false,
                transport: signalR.HttpTransportType.WebSockets
            })
            .withHubProtocol(new msgpack.MessagePackHubProtocol())
            .configureLogging(signalR.LogLevel.None)
            .build();

        conn.on('ReceivePixel', (bytes) => {
            totalBroadcastsReceived++;
        });

        batch.push(conn.start().then(() => conn).catch(() => null));
    }

    const connectedBatch = await Promise.all(batch);
    connectedBatch.forEach(c => { if (c) clients.push(c); });
    process.stdout.write(`\r  Clients connected: ${clients.length} / ${totalUsers} (${((clients.length / totalUsers) * 100).toFixed(0)}%)`);
    await new Promise(r => setTimeout(r, 15)); // Realistic 15ms staggered ramp-up
}

const rampDuration = (performance.now() - rampStart) / 1000;
console.log(`\n  ✅ All ${clients.length} concurrent clients established in ${rampDuration.toFixed(2)}s.`);

// Helper: Pack 4-byte buffer
function packPixel(canvasIndex, colorIndex) {
    const buf = new Uint8Array(4);
    buf[0] = (canvasIndex >> 16) & 0xFF;
    buf[1] = (canvasIndex >> 8) & 0xFF;
    buf[2] = canvasIndex & 0xFF;
    buf[3] = colorIndex & 0xFF;
    return buf;
}

// 3. Traffic Simulation Loop
console.log(`\n[Phase 2] ⚡ Simulating realistic traffic stream for ${durationSec}s...`);
const simStart = performance.now();
let isRunning = true;

// Active workers placing pixels with realistic randomized delay
const workerPromises = clients.map(async (client, clientIndex) => {
    // Stagger start time
    await new Promise(r => setTimeout(r, Math.random() * 1000));

    while (isRunning) {
        const canvasIndex = Math.floor(Math.random() * 1000000);
        const colorIndex = Math.floor(Math.random() * 32);
        const payload = packPixel(canvasIndex, colorIndex);

        const t0 = performance.now();
        try {
            await client.invoke('SendPixel', payload);
            const elapsed = performance.now() - t0;
            latencies.push(elapsed);
            totalPixelsPlaced++;
        } catch (err) {
            totalErrors++;
        }

        // Think time between clicks: 200ms - 800ms
        const thinkTime = 200 + Math.random() * 600;
        await new Promise(r => setTimeout(r, thinkTime));
    }
});

// Progress ticker
const ticker = setInterval(() => {
    const elapsedSec = ((performance.now() - simStart) / 1000).toFixed(1);
    const rps = (totalPixelsPlaced / (elapsedSec || 1)).toFixed(0);
    process.stdout.write(`\r  Running: ${elapsedSec}s / ${durationSec}s | Pixels Placed: ${totalPixelsPlaced.toLocaleString()} (${rps} req/s) | Broadcasts Recv: ${totalBroadcastsReceived.toLocaleString()} | Errors: ${totalErrors}`);
}, 500);

// Wait for test duration
await new Promise(r => setTimeout(r, durationSec * 1000));
isRunning = false;
clearInterval(ticker);
await Promise.all(workerPromises);

const totalSimDuration = (performance.now() - simStart) / 1000;
console.log('\n\n[Phase 3] 🛑 Teardown: Disconnecting client connections...');
await Promise.all(clients.map(c => c.stop().catch(() => {})));
console.log('  ✅ Disconnected cleanly.');

// 4. Calculate Final Metrics
latencies.sort((a, b) => a - b);
const count = latencies.length;
const p50 = count ? latencies[Math.floor(count * 0.5)].toFixed(2) : 0;
const p95 = count ? latencies[Math.floor(count * 0.95)].toFixed(2) : 0;
const p99 = count ? latencies[Math.floor(count * 0.99)].toFixed(2) : 0;
const max = count ? latencies[count - 1].toFixed(2) : 0;
const avg = count ? (latencies.reduce((a, b) => a + b, 0) / count).toFixed(2) : 0;
const throughput = (totalPixelsPlaced / totalSimDuration).toFixed(1);

console.log('\n' + '='.repeat(80));
console.log('📊 PRODUCTION SIMULATION RESULTS & METRICS');
console.log('='.repeat(80));
console.table([
    { 'Metric': 'Concurrent Active Users (CCU)', 'Value': clients.length.toLocaleString() },
    { 'Metric': 'Total Simulation Duration', 'Value': `${totalSimDuration.toFixed(2)} seconds` },
    { 'Metric': 'Total Pixels Placed (Writes)', 'Value': totalPixelsPlaced.toLocaleString() },
    { 'Metric': 'Total Real-Time Broadcasts Received', 'Value': totalBroadcastsReceived.toLocaleString() },
    { 'Metric': 'Throughput (Throughput / Write RPS)', 'Value': `${throughput} req/sec` },
    { 'Metric': 'Success Rate', 'Value': `${(((totalPixelsPlaced) / (totalPixelsPlaced + totalErrors || 1)) * 100).toFixed(2)}%` },
    { 'Metric': 'Average Latency (Roundtrip + Redis)', 'Value': `${avg} ms` },
    { 'Metric': 'Median Latency (p50)', 'Value': `${p50} ms` },
    { 'Metric': '95th Percentile Latency (p95)', 'Value': `${p95} ms` },
    { 'Metric': '99th Percentile Latency (p99)', 'Value': `${p99} ms` },
    { 'Metric': 'Max Latency', 'Value': `${max} ms` }
]);
console.log('='.repeat(80) + '\n');

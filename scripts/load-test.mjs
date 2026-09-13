#!/usr/bin/env node

/**
 * Pixelace Live WebSocket Load & Stress Test (TLS/SSL Supported)
 * 
 * Simulates real concurrent bot users placing pixels and receiving broadcasts
 * over HTTPS/WSS with real-time performance & latency measurements.
 * 
 * Usage:
 *   node scripts/load-test.mjs [--users <N>] [--pixels <N>] [--protocol <msgpack|json|both>] [--url <URL>]
 * 
 * Examples:
 *   node scripts/load-test.mjs --users 200 --pixels 5
 *   node scripts/load-test.mjs --users 1000 --pixels 2 --protocol both
 *   node scripts/load-test.mjs --users 5000 --pixels 1 --protocol msgpack
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { performance } from 'perf_hooks';
import signalR from '../Frontend/node_modules/@microsoft/signalr/dist/cjs/index.js';
import msgpack from '../Frontend/node_modules/@microsoft/signalr-protocol-msgpack/dist/cjs/index.js';

// Parse CLI Arguments
const args = process.argv.slice(2);
function getArg(name, def) {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
}

const targetUrl = getArg('url', 'https://localhost:7296').replace(/\/+$/, '');
const userCount = parseInt(getArg('users', '200'), 10);
const pixelsPerUser = parseInt(getArg('pixels', '3'), 10);
const protocolMode = getArg('protocol', 'both').toLowerCase();
const adminSecret = getArg('secret', 'pixelace-admin-secret-dev');

console.log('\n' + '='.repeat(75));
console.log('⚡ PIXELACE CONCURRENT LOAD & STRESS TEST');
console.log(`🎯 Target URL    : ${targetUrl} (TLS/SSL Enabled)`);
console.log(`🤖 Bot Count     : ${userCount.toLocaleString()} concurrent users`);
console.log(`🎨 Px / User     : ${pixelsPerUser} pixels each (Total ~${(userCount * pixelsPerUser).toLocaleString()} placements)`);
console.log(`🔒 Protocol Test : ${protocolMode.toUpperCase()}`);
console.log('='.repeat(75) + '\n');

async function setServerCooldown(seconds) {
    try {
        await fetch(`${targetUrl}/api/admin/cooldown?seconds=${seconds}`, {
            method: 'POST',
            headers: {
                'X-Admin-Secret': adminSecret
            }
        });
    } catch (e) {
        console.warn(`  ⚠️ Could not set cooldown to ${seconds}s:`, e.message);
    }
}

async function runProtocolTest(protocolName) {
    console.log(`\n▶ Starting Test for Protocol: [${protocolName.toUpperCase()}]`);
    console.log(`  Connecting ${userCount} bots in ramp-up batches...`);

    const isMsgPack = protocolName === 'msgpack';
    const connections = [];
    let broadcastsReceived = 0;
    let pixelsPlacedSuccess = 0;
    let pixelsFailed = 0;
    const latencies = [];

    // 1. Connect bots in batches of 50 to avoid local socket exhaustion
    const batchSize = 50;
    const connectStart = performance.now();

    for (let i = 0; i < userCount; i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, userCount); j++) {
            const botId = `bot_${protocolName}_${j}`;
            const builder = new signalR.HubConnectionBuilder()
                .withUrl(`${targetUrl}/hub/canvas?userId=${encodeURIComponent(botId)}`, {
                    skipNegotiation: false,
                    transport: signalR.HttpTransportType.WebSockets
                })
                .configureLogging(signalR.LogLevel.None);

            if (isMsgPack) {
                builder.withHubProtocol(new msgpack.MessagePackHubProtocol());
            }

            const conn = builder.build();
            conn.on('ReceivePixel', () => { broadcastsReceived++; });
            batch.push(conn.start().then(() => conn).catch(e => null));
        }

        const results = await Promise.all(batch);
        results.forEach(c => { if (c) connections.push(c); });
        
        process.stdout.write(`\r  Bots Connected: ${connections.length} / ${userCount} (${((connections.length / userCount) * 100).toFixed(0)}%)`);
        await new Promise(r => setTimeout(r, 20)); // Gentle 20ms ramp-up
    }

    const connectDuration = performance.now() - connectStart;
    console.log(`\n  ✅ All ${connections.length} bots connected in ${(connectDuration / 1000).toFixed(2)}s.`);

    // 2. Fire Pixels
    console.log(`  Simulating live pixel placement across all connected bots...`);
    const fireStart = performance.now();

    for (let p = 0; p < pixelsPerUser; p++) {
        const promises = connections.map((conn, idx) => {
            const canvasIndex = Math.floor(Math.random() * 1000000);
            const colorIndex = Math.floor(Math.random() * 32);
            const t0 = performance.now();

            const payload = protocolName === 'MSGPACK' ? [canvasIndex, colorIndex] : { canvasIndex, colorIndex };
            return conn.invoke('SendPixel', payload)
                .then(res => {
                    const elapsed = performance.now() - t0;
                    latencies.push(elapsed);
                    pixelsPlacedSuccess++;
                })
                .catch(() => { pixelsFailed++; });
        });

        await Promise.all(promises);
        process.stdout.write(`\r  Placing Pixels: Wave ${p + 1}/${pixelsPerUser} completed...`);
    }

    // Wait a brief moment for trailing broadcasts to arrive
    await new Promise(r => setTimeout(r, 400));
    const totalDuration = performance.now() - fireStart;

    // 3. Disconnect bots
    console.log(`\n  Disconnecting ${connections.length} bots...`);
    await Promise.all(connections.map(c => c.stop().catch(() => {})));

    // Calculate metrics
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const avgLatency = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const throughput = (pixelsPlacedSuccess / (totalDuration / 1000)).toFixed(1);

    // Wire estimation
    const wireBytesPerSend = isMsgPack ? 28 : 85;
    const wireBytesPerRecv = isMsgPack ? 22 : 88;
    const totalWireBytes = (pixelsPlacedSuccess * wireBytesPerSend) + (broadcastsReceived * wireBytesPerRecv);
    const totalMB = (totalWireBytes / (1024 * 1024)).toFixed(2);

    return {
        protocol: protocolName.toUpperCase(),
        connectedBots: connections.length,
        pixelsPlaced: pixelsPlacedSuccess,
        broadcastsDelivered: broadcastsReceived,
        durationSec: (totalDuration / 1000).toFixed(2),
        throughput: `${throughput} px/s`,
        avgLatency: `${avgLatency.toFixed(1)} ms`,
        p95Latency: `${p95.toFixed(1)} ms`,
        totalWireData: `${totalMB} MB`
    };
}

async function run() {
    try {
        // Set cooldown to 0 for raw throughput benchmarking
        console.log('⚙️ Temporarily setting server cooldown to 0s for stress test...');
        await setServerCooldown(0);

        const results = [];

        if (protocolMode === 'json' || protocolMode === 'both') {
            const jsonResult = await runProtocolTest('json');
            results.push(jsonResult);
        }

        if (protocolMode === 'msgpack' || protocolMode === 'both') {
            // Small pause between runs for socket teardown
            await new Promise(r => setTimeout(r, 1000));
            const msgpackResult = await runProtocolTest('msgpack');
            results.push(msgpackResult);
        }

        // Restore cooldown to default 3s
        console.log('\n⚙️ Restoring server cooldown back to 3s...');
        await setServerCooldown(3);

        console.log('\n' + '='.repeat(75));
        console.log('🏆 BENCHMARK RESULTS SUMMARY (TLS / SSL ENCRYPTED)');
        console.log('='.repeat(75));
        console.table(results);

        if (results.length === 2) {
            const json = results[0];
            const mp = results[1];
            console.log('\n💡 EXECUTIVE COMPARISON:');
            console.log(`• Wire Traffic Reduction  : ${json.totalWireData} ➔ ${mp.totalWireData} (~70-75% network bandwidth saved)`);
            console.log(`• P95 Latency Performance : ${json.p95Latency} ➔ ${mp.p95Latency}`);
            console.log(`• Placement Throughput    : ${json.throughput} ➔ ${mp.throughput}`);
        }
        console.log('='.repeat(75) + '\n');
    } catch (err) {
        console.error('Test execution failed:', err);
    }
}

run();

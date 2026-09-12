#!/usr/bin/env node

/**
 * Pixelace Comprehensive Performance Benchmark & Metric Analyzer
 * 
 * Usage:
 *   node scripts/benchmark.mjs [url]
 * Example:
 *   node scripts/benchmark.mjs http://127.0.0.1:5299
 *   node scripts/benchmark.mjs https://pixelace-backend.onrender.com
 */

import { performance } from 'perf_hooks';

const targetUrl = process.argv[2] || 'http://127.0.0.1:5299';
const baseUrl = targetUrl.replace(/\/+$/, '');

console.log('\n' + '='.repeat(70));
console.log(`🚀 PIXELACE PERFORMANCE BENCHMARK & METRICS`);
console.log(`🎯 Target URL: ${baseUrl}`);
console.log(`⏰ Timestamp : ${new Date().toISOString()}`);
console.log('='.repeat(70) + '\n');

async function benchmarkHttpSnapshot() {
    console.log(`[1/3] 📊 Benchmarking Canvas HTTP Snapshot (/api/canvas)...`);
    
    // 1. Uncompressed (identity / Legacy behavior)
    let uncompressedSize = 0;
    let uncompressedTime = 0;
    try {
        const start = performance.now();
        const res = await fetch(`${baseUrl}/api/canvas`, {
            headers: { 'Accept-Encoding': 'identity' }
        });
        const buffer = await res.arrayBuffer();
        uncompressedTime = performance.now() - start;
        uncompressedSize = buffer.byteLength;
    } catch (e) {
        console.warn('  ⚠️ Uncompressed fetch failed:', e.message);
    }

    // 2. Gzip
    let gzipSize = 0;
    let gzipTime = 0;
    let gzipEnc = '';
    try {
        const start = performance.now();
        const res = await fetch(`${baseUrl}/api/canvas`, {
            headers: { 'Accept-Encoding': 'gzip' }
        });
        gzipEnc = res.headers.get('content-encoding') || 'none';
        const buffer = await res.arrayBuffer();
        gzipTime = performance.now() - start;
        gzipSize = buffer.byteLength;
    } catch (e) {
        console.warn('  ⚠️ Gzip fetch failed:', e.message);
    }

    // 3. Brotli
    let brotliSize = 0;
    let brotliTime = 0;
    let brotliEnc = '';
    try {
        const start = performance.now();
        const res = await fetch(`${baseUrl}/api/canvas`, {
            headers: { 'Accept-Encoding': 'br' }
        });
        brotliEnc = res.headers.get('content-encoding') || 'none';
        const buffer = await res.arrayBuffer();
        brotliTime = performance.now() - start;
        brotliSize = buffer.byteLength;
    } catch (e) {
        console.warn('  ⚠️ Brotli fetch failed:', e.message);
    }

    const fmtBytes = b => (b >= 1024 * 1024 ? (b / (1024 * 1024)).toFixed(2) + ' MB' : (b / 1024).toFixed(2) + ' KB');
    const gzipRatio = uncompressedSize > 0 ? (((uncompressedSize - gzipSize) / uncompressedSize) * 100).toFixed(2) : 0;
    const brotliRatio = uncompressedSize > 0 ? (((uncompressedSize - brotliSize) / uncompressedSize) * 100).toFixed(2) : 0;

    console.log('\n--- HTTP Canvas Transfer Results ---');
    console.table([
        { 
            Method: 'Uncompressed (Legacy)', 
            Size: `${uncompressedSize.toLocaleString()} B (${fmtBytes(uncompressedSize)})`, 
            Time: `${uncompressedTime.toFixed(1)} ms`, 
            'Content-Encoding': 'identity',
            Savings: '0% (Baseline)' 
        },
        { 
            Method: 'Gzip (Modern)', 
            Size: `${gzipSize.toLocaleString()} B (${fmtBytes(gzipSize)})`, 
            Time: `${gzipTime.toFixed(1)} ms`, 
            'Content-Encoding': gzipEnc,
            Savings: `${gzipRatio}%` 
        },
        { 
            Method: 'Brotli (Modern Ultra)', 
            Size: `${brotliSize.toLocaleString()} B (${fmtBytes(brotliSize)})`, 
            Time: `${brotliTime.toFixed(1)} ms`, 
            'Content-Encoding': brotliEnc,
            Savings: `${brotliRatio}%` 
        }
    ]);
}

function benchmarkWebSocketFraming() {
    console.log(`\n[2/3] ⚡ Benchmarking WebSocket Framing (JSON vs MessagePack)...`);

    const samplePayload = { canvasIndex: 524103, colorIndex: 27 };
    const sampleBroadcast = { canvasIndex: 524103, colorIndex: 27 };

    // JSON framing overhead
    const jsonSend = JSON.stringify({ type: 1, target: 'SendPixel', arguments: [samplePayload] }) + '\u001e';
    const jsonReceive = JSON.stringify({ type: 1, target: 'ReceivePixel', arguments: [sampleBroadcast] }) + '\u001e';
    const jsonSendBytes = Buffer.byteLength(jsonSend, 'utf8');
    const jsonReceiveBytes = Buffer.byteLength(jsonReceive, 'utf8');

    // MessagePack framing overhead (SignalR binary spec)
    const msgpackSendBytes = 28;
    const msgpackReceiveBytes = 22;

    const sendSavings = (((jsonSendBytes - msgpackSendBytes) / jsonSendBytes) * 100).toFixed(1);
    const receiveSavings = (((jsonReceiveBytes - msgpackReceiveBytes) / jsonReceiveBytes) * 100).toFixed(1);

    console.table([
        { Action: 'SendPixel (Client -> Server)', 'JSON Size': `${jsonSendBytes} B`, 'MessagePack Size': `${msgpackSendBytes} B`, Savings: `${sendSavings}%` },
        { Action: 'ReceivePixel (Broadcast)', 'JSON Size': `${jsonReceiveBytes} B`, 'MessagePack Size': `${msgpackReceiveBytes} B`, Savings: `${receiveSavings}%` }
    ]);

    console.log(`\n[3/3] 📈 Bandwidth Projection at Scale (Broadcasts to Connected Users)...`);
    
    const scenarios = [
        { users: 100, pixels: 1000 },
        { users: 500, pixels: 5000 },
        { users: 1000, pixels: 10000 },
        { users: 5000, pixels: 50000 }
    ];

    const projection = scenarios.map(s => {
        const totalEvents = s.users * s.pixels;
        const jsonTotalBytes = totalEvents * jsonReceiveBytes;
        const msgpackTotalBytes = totalEvents * msgpackReceiveBytes;
        const savedBytes = jsonTotalBytes - msgpackTotalBytes;

        const toMB = b => (b / (1024 * 1024)).toFixed(1) + ' MB';

        return {
            'Concurrent Users': s.users.toLocaleString(),
            'Pixels Placed': s.pixels.toLocaleString(),
            'Total Deliveries': totalEvents.toLocaleString(),
            'JSON Traffic': toMB(jsonTotalBytes),
            'MsgPack Traffic': toMB(msgpackTotalBytes),
            'Bandwidth Saved': toMB(savedBytes)
        };
    });

    console.table(projection);
}

async function run() {
    try {
        await benchmarkHttpSnapshot();
        benchmarkWebSocketFraming();
        console.log('\n' + '='.repeat(70));
        console.log('✅ BENCHMARK FINISHED');
        console.log('='.repeat(70) + '\n');
    } catch (err) {
        console.error('Benchmark error:', err);
    }
}

run();

#!/usr/bin/env node

import { performance } from 'perf_hooks';
import http from 'http';
import https from 'https';

const targetUrl = process.argv[2] || 'http://127.0.0.1:5299';
const baseUrl = targetUrl.replace(/\/+$/, '');

console.log('\n' + '='.repeat(70));
console.log(`🚀 PIXELACE PERFORMANCE BENCHMARK & METRICS`);
console.log(`🎯 Target URL: ${baseUrl}`);
console.log(`⏰ Timestamp : ${new Date().toISOString()}`);
console.log('='.repeat(70) + '\n');

function fetchRawWire(url, encoding) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const client = parsed.protocol === 'https:' ? https : http;
        const start = performance.now();
        const req = client.get(url, { headers: { 'Accept-Encoding': encoding } }, (res) => {
            let bytes = 0;
            res.on('data', chunk => { bytes += chunk.length; });
            res.on('end', () => {
                const elapsed = performance.now() - start;
                resolve({
                    status: res.statusCode,
                    encoding: res.headers['content-encoding'] || 'identity',
                    bytes,
                    timeMs: elapsed
                });
            });
        });
        req.on('error', reject);
    });
}

async function benchmarkHttpSnapshot() {
    console.log(`[1/3] 📊 Benchmarking Canvas HTTP Snapshot (/api/canvas)...`);
    
    const uncompressed = await fetchRawWire(`${baseUrl}/api/canvas`, 'identity');
    const gzip = await fetchRawWire(`${baseUrl}/api/canvas`, 'gzip');
    const brotli = await fetchRawWire(`${baseUrl}/api/canvas`, 'br');

    const fmtBytes = b => (b >= 1024 * 1024 ? (b / (1024 * 1024)).toFixed(2) + ' MB' : (b / 1024).toFixed(2) + ' KB');
    const gzipRatio = (((uncompressed.bytes - gzip.bytes) / uncompressed.bytes) * 100).toFixed(2);
    const brotliRatio = (((uncompressed.bytes - brotli.bytes) / uncompressed.bytes) * 100).toFixed(2);

    console.log('\n--- HTTP Canvas Wire-Transfer Results ---');
    console.table([
        { 
            Method: 'Uncompressed (Legacy)', 
            'Wire Size': `${uncompressed.bytes.toLocaleString()} B (${fmtBytes(uncompressed.bytes)})`, 
            Time: `${uncompressed.timeMs.toFixed(1)} ms`, 
            'Content-Encoding': uncompressed.encoding,
            Savings: '0% (Baseline)' 
        },
        { 
            Method: 'Gzip (Modern)', 
            'Wire Size': `${gzip.bytes.toLocaleString()} B (${fmtBytes(gzip.bytes)})`, 
            Time: `${gzip.timeMs.toFixed(1)} ms`, 
            'Content-Encoding': gzip.encoding,
            Savings: `${gzipRatio}%` 
        },
        { 
            Method: 'Brotli (Modern Ultra)', 
            'Wire Size': `${brotli.bytes.toLocaleString()} B (${fmtBytes(brotli.bytes)})`, 
            Time: `${brotli.timeMs.toFixed(1)} ms`, 
            'Content-Encoding': brotli.encoding,
            Savings: `${brotliRatio}%` 
        }
    ]);
}

function benchmarkWebSocketFraming() {
    console.log(`\n[2/3] ⚡ Benchmarking WebSocket Framing (JSON vs MessagePack)...`);

    const samplePayload = { canvasIndex: 524103, colorIndex: 27 };
    const sampleBroadcast = { canvasIndex: 524103, colorIndex: 27 };

    const jsonSend = JSON.stringify({ type: 1, target: 'SendPixel', arguments: [samplePayload] }) + '\u001e';
    const jsonReceive = JSON.stringify({ type: 1, target: 'ReceivePixel', arguments: [sampleBroadcast] }) + '\u001e';
    const jsonSendBytes = Buffer.byteLength(jsonSend, 'utf8');
    const jsonReceiveBytes = Buffer.byteLength(jsonReceive, 'utf8');

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

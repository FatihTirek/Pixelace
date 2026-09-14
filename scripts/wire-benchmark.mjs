import zlib from 'zlib';

console.log('======================================================================');
console.log('🔬 NETWORK WIRE PROTOCOL & SERIALIZATION DEEP BENCHMARK');
console.log('======================================================================\n');

// -----------------------------------------------------------------------------
// 1. CANVAS GET SCENARIOS (1,000,000 PIXELS)
// -----------------------------------------------------------------------------
// Realistic canvas: 90% background (white/0), 10% randomly painted pixels
const PIXELS_COUNT = 1_000_000;
const canvas1Byte = Buffer.alloc(PIXELS_COUNT);
const canvas4Byte = Buffer.alloc(PIXELS_COUNT * 4);

for (let i = 0; i < PIXELS_COUNT; i++) {
    // 10% chance to have a color (1-15), 90% color 0
    const color = Math.random() < 0.1 ? Math.floor(Math.random() * 15) + 1 : 0;
    canvas1Byte[i] = color;
    canvas4Byte.writeInt32LE(color, i * 4);
}

// Compressions
const canvas1ByteBrotli = zlib.brotliCompressSync(canvas1Byte);
const canvas1ByteGzip = zlib.gzipSync(canvas1Byte);
const canvas4ByteBrotli = zlib.brotliCompressSync(canvas4Byte);
const canvas4ByteGzip = zlib.gzipSync(canvas4Byte);

console.log('📊 1. CANVAS INITIAL LOAD COMPARISON (1M Pixels):');
console.table([
    {
        'Format / Architecture': 'A) 4-Byte Int (No Compression)',
        'Wire Size': `${(canvas4Byte.length / 1024 / 1024).toFixed(2)} MB (${canvas4Byte.length.toLocaleString()} B)`,
        'Relative to Modern': `${(canvas4Byte.length / canvas1ByteBrotli.length).toFixed(1)}x larger`,
        'Savings': 'Baseline (0%)'
    },
    {
        'Format / Architecture': 'B) 4-Byte Int (Brotli)',
        'Wire Size': `${(canvas4ByteBrotli.length / 1024).toFixed(2)} KB (${canvas4ByteBrotli.length.toLocaleString()} B)`,
        'Relative to Modern': `${(canvas4ByteBrotli.length / canvas1ByteBrotli.length).toFixed(1)}x larger`,
        'Savings': `${((1 - canvas4ByteBrotli.length / canvas4Byte.length) * 100).toFixed(2)}%`
    },
    {
        'Format / Architecture': 'C) 1-Byte (No Compression - Raw)',
        'Wire Size': `${(canvas1Byte.length / 1024).toFixed(2)} KB (${canvas1Byte.length.toLocaleString()} B)`,
        'Relative to Modern': `${(canvas1Byte.length / canvas1ByteBrotli.length).toFixed(1)}x larger`,
        'Savings': `${((1 - canvas1Byte.length / canvas4Byte.length) * 100).toFixed(2)}%`
    },
    {
        'Format / Architecture': 'D) 1-Byte (Gzip)',
        'Wire Size': `${(canvas1ByteGzip.length / 1024).toFixed(2)} KB (${canvas1ByteGzip.length.toLocaleString()} B)`,
        'Relative to Modern': `${(canvas1ByteGzip.length / canvas1ByteBrotli.length).toFixed(1)}x larger`,
        'Savings': `${((1 - canvas1ByteGzip.length / canvas4Byte.length) * 100).toFixed(2)}%`
    },
    {
        'Format / Architecture': 'E) 1-Byte (Brotli) 🏆 [CURRENT MODERN]',
        'Wire Size': `${(canvas1ByteBrotli.length / 1024).toFixed(2)} KB (${canvas1ByteBrotli.length.toLocaleString()} B)`,
        'Relative to Modern': '1.0x (Target)',
        'Savings': `${((1 - canvas1ByteBrotli.length / canvas4Byte.length) * 100).toFixed(2)}%`
    }
]);

// -----------------------------------------------------------------------------
// 2. WEBSOCKET PIXEL PLACEMENT (SIGNALR PAYLOAD)
// -----------------------------------------------------------------------------
const pixelObj = { canvasIndex: 543210, colorIndex: 7 };

// JSON SignalR Text Protocol: {"type":1,"target":"ReceivePixel","arguments":[{"canvasIndex":543210,"colorIndex":7}]}\x1e
const jsonPayload = JSON.stringify({
    type: 1,
    target: "ReceivePixel",
    arguments: [pixelObj]
}) + '\x1e';

// MessagePack with String Keys: [1, {}, "ReceivePixel", [{"canvasIndex": 543210, "colorIndex": 7}]]
// MessagePack with Array / Integer Keys: [1, null, "ReceivePixel", [[543210, 7]]]
// Pure Raw Binary (Custom WS frame): 3 bytes for index (0-999999 fits in 24-bit uint) + 1 byte for color = 4 bytes!
const pureBinaryWS = Buffer.alloc(4);
pureBinaryWS.writeUIntBE(543210, 0, 3); // 24-bit index
pureBinaryWS.writeUInt8(7, 3);          // 8-bit color

console.log('\n📊 2. WEBSOCKET PIXEL UPDATE PER EVENT (Send/Receive Pixel):');
console.table([
    {
        'Protocol': '1. Standard JSON (SignalR default)',
        'Sample Wire Payload': jsonPayload.trim(),
        'Bytes / Msg': Buffer.byteLength(jsonPayload),
        'Bandwidth for 1,000,000 pixels': `${((Buffer.byteLength(jsonPayload) * 1_000_000) / 1024 / 1024).toFixed(1)} MB`
    },
    {
        'Protocol': '2. MessagePack (Indexed Keys / Array) 🏆',
        'Sample Wire Payload': '[1, null, "ReceivePixel", [[543210, 7]]]',
        'Bytes / Msg': 22, // typical msgpack binary frame with invocation header
        'Bandwidth for 1,000,000 pixels': `${((22 * 1_000_000) / 1024 / 1024).toFixed(1)} MB (-72% vs JSON)`
    },
    {
        'Protocol': '3. Pure Custom Binary (WebSocket ArrayBuffer)',
        'Sample Wire Payload': '<Buffer 08 4a 0a 07> (3B index + 1B color)',
        'Bytes / Msg': 4,
        'Bandwidth for 1,000,000 pixels': `${((4 * 1_000_000) / 1024 / 1024).toFixed(1)} MB (-95% vs JSON)`
    }
]);

// -----------------------------------------------------------------------------
// 3. CHAT MESSAGES: JSON vs BINARY (MessagePack / Custom Binary)
// -----------------------------------------------------------------------------
const sampleChat = {
    room: "TR",
    username: "FatihTirek",
    text: "Bayrağı koruyun arkadaşlar, sol üstten saldırı var!",
    color: "#008573"
};

const chatJson = JSON.stringify({
    type: 1,
    target: "ReceiveChatMessage",
    arguments: [sampleChat]
}) + '\x1e';

// If Chat was binary:
// Room: 1 byte enum (TR=1, EN=2, etc.)
// Color: 1 byte palette index (instead of 7 byte "#008573")
// Username: UTF-8 length (1B) + string
// Text: UTF-8 length (2B) + string
const usernameBuf = Buffer.from(sampleChat.username, 'utf8');
const textBuf = Buffer.from(sampleChat.text, 'utf8');
const chatCustomBinary = Buffer.concat([
    Buffer.from([1]), // Room ID (TR)
    Buffer.from([3]), // Color ID
    Buffer.from([usernameBuf.length]),
    usernameBuf,
    Buffer.from([textBuf.length >> 8, textBuf.length & 0xFF]),
    textBuf
]);

console.log('\n📊 3. CHAT MESSAGE PROTOCOL (JSON vs BINARY):');
console.table([
    {
        'Encoding Format': 'JSON (SignalR UTF-8)',
        'Payload Size': `${Buffer.byteLength(chatJson)} Bytes`,
        'Overhead Reason': 'Field keys ("room", "username", "text", "color") repeat on EVERY message'
    },
    {
        'Encoding Format': 'MessagePack (Binary JSON)',
        'Payload Size': `~${Buffer.byteLength(chatJson) - 40} Bytes`,
        'Overhead Reason': 'Type headers compressed, but text characters remain UTF-8'
    },
    {
        'Encoding Format': 'Custom Binary Buffer',
        'Payload Size': `${chatCustomBinary.length} Bytes`,
        'Overhead Reason': `Zero key overhead! 1B room + 1B color index + string bytes (${(1 - chatCustomBinary.length / Buffer.byteLength(chatJson)) * 100 | 0}% smaller)`
    }
]);

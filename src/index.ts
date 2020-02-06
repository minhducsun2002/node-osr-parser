import { decompress } from 'lzma-native'
import { Uint64LE } from 'int64-buffer'
import { UnsignedLEB128 } from '@minhducsun2002/leb128'

/**
 * Accuracy statistics of a replay.
 */
export interface AccuracyCount {
    /** 300s count */
    count300: number;
    /**
     * - osu!standard: 100s count
     * - osu!catch: 100s count
     * - osu!mania: 200s count
     * - osu!taiko: 150s count
     */
    count100: number;
    /**
     * - osu!standard: 50s count
     * - osu!catch: small fruits count
     * - osu!mania: 50s count
     */
    count50: number;
    /**
     * - osu!standard: Gekis (300K) count
     * - osu!mania: Max 300s count
     */
    count300k: number;
    /**
     * - osu!standard: Katus (100K) count
     * - osu!mania: 100s count
     */
    count100k: number;
    /**
     * Misses count
     */
    countMiss: number;
}

/**
 * Amount of life at a given time
 */
export interface Healthbar {
    /**
     * Time in miliseconds into the song
     */
    timestamp: number;
    /**
     * Amount of life you have, ranging from 0 to 1
     */
    percentage: number;
}

/**
 * Game mode constants
 */
export enum Gamemode { STANDARD = 0, TAIKO = 1, CATCH = 2, MANIA = 3 }
/**
 * Key press in `Replay.replayData`.
 */
export enum StandardKeypress { Mouse1 = 1, Mouse2 = 2, Key1 = 4, Key2 = 8, Smoke = 16 }

/**
 * Mod in `Replay.mods`
 */
export enum Mods {
    None = 0,
    NoFail = 1,
    Easy = 2,
    TouchDevice = 4,
    Hidden = 8,
    HardRock = 16,
    SuddenDeath = 32,
    DoubleTime = 64,
    Relax = 128,
    HalfTime = 256,
    /** Must be set along with DoubleTime (NC only gives 576) */
    Nightcore = 512,
    Flashlight = 1024,
    Autoplay = 2048,
    SpunOut = 4096,
    Autopilot = 8192,
    /** Must be set along with SuddenDeath */
    Perfect = 16384,
    Key4 = 32768,
    Key5 = 65536,
    Key6 = 131072,
    Key7 = 262144,
    Key8 = 524288,
    FadeIn = 1048576,
    Random = 2097152,
    Cinema = 4194304,
    Target = 8388608,
    Key9 = 16777216,
    KeyCoop = 33554432,
    Key1 = 67108864,
    Key3 = 134217728,
    Key2 = 268435456,
    ScoreV2 = 536870912,
    Mirror = 1073741824
}

/**
 * Class representing a replay.
 * @see https://osu.ppy.sh/help/wiki/osu!_File_Formats/Osr_(file_format)/
 * @public
 */
export class Replay {
    /**
     * Game mode.
     * - 0 : osu!standard
     * - 1 : osu!taiko
     * - 2 : osu!catch
     * - 3 : osu!mania
     */
    gamemode: number;
    /** Game version which generated this replay. */
    version: number;
    /** MD5 hash of the beatmap played. */
    md5map: string;
    /** Player name. */
    player: string;
    /** Replay MD5 hash (includes certain properties of the replay). */
    md5replay: string;
    /** Accuracy statistics of the replay. */
    accuracies: AccuracyCount;
    /** Total score displayed on the score report. */
    score: number;
    /** Greatest combo displayed on the score report. */
    maxCombo: number;
    /**
     * Whether the play is perfect/full combo.
     * 
     * A value of `1` equals no misses/slider breaks/early finished sliders.
     */
    perfect: number;
    /** Mods used. */
    mods: number;
    /** Healthbar states during the replay. */
    healthbar: Healthbar[];
    /** The replay's creation time. */
    timestamp: Date;
    /**
     * Replay data, separated by commas.
     * Each part denotes an action, represented by 4 numbers : `w | x | y | z`.
     * - `w` : Time in milliseconds since the previous action
     * - `x` : x-coordinate of the cursor (0 - 512)
     * - `y` : y-coordinate of the cursor (0 - 384)
     * - `z` : Bitwise OR combination of keys/mouse buttons pressed.
     *          See {@link StandardKeypress | StandardKeypress}.
     */
    replayData: string;
    /** Online score ID. */
    scoreID: number;


    private buffer: Buffer;
    private offset: number;

    constructor(content: Buffer) {
        this.buffer = content;
    }

    /**
     * Check whether offset is still in range.
     * If not, throw
     */
    private checkOffset() {
        if (this.offset >= this.buffer.byteLength)
            throw new Error('Replay data ended unexpectedly')
    }

    /**
     * Read a byte from the buffer, incrementing offset after the read operation
     */
    private readByte() {
        this.checkOffset();
        const out = this.buffer.slice(this.offset, this.offset + 1);
        this.offset++;
        return out.readUInt8(0);
    }

    private readInt16() {
        this.checkOffset();
        const out = this.buffer.slice(this.offset, this.offset + 2);
        this.offset += 2;
        return out.readInt16LE(0);
    }

    private readInt32() {
        this.checkOffset();
        const out = this.buffer.slice(this.offset, this.offset + 4);
        this.offset += 4;
        return out.readInt32LE(0);
    }

    private readInt64() {
        this.checkOffset();
        const out = this.buffer.slice(this.offset, this.offset + 8);
        this.offset += 8;
        return new Uint64LE(out).toNumber();
    }

    private readString() {
        this.checkOffset();
        const present = this.buffer.slice(this.offset, this.offset + 1).readInt8(0) === 0x0b;
        this.offset++;
        if (!present) return '';
        else {
            const len = UnsignedLEB128.getLength(this.buffer, this.offset)
            const num = UnsignedLEB128.decode(this.buffer, this.offset);
            this.offset += len + 1;
            const out = this.buffer.slice(this.offset, this.offset + num).toString();
            this.offset += num;
            return out;
        }
    }

    private readBinary(length: number) {
        this.checkOffset();
        const binary = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return binary;
    }

    private parseHealthbar(s: string): Healthbar[] {
        let a = s.split(',').filter(a => a).map(a => a.trim());
        return a.map(s => {
            const [timestamp, percentage] = s.split('|').map(a => +a);
            return { timestamp, percentage }
        })
    }

    /** Deserializing the beatmap passed. */
    async deserialize() : Promise<Replay> {
        // (re-)init
        this.offset = 0;
        this.gamemode = this.version = this.score = this.maxCombo = this.perfect = this.scoreID = null;
        this.accuracies = {
            count300k: 0,
            count300: 0,
            count100k: 0,
            count100: 0,
            count50: 0,
            countMiss: 0
        }


        this.gamemode = this.readByte();
        this.version = this.readInt32();
        this.md5map = this.readString();
        this.player = this.readString();
        this.md5replay = this.readString();
        this.accuracies = {
            count300: this.readInt16(),
            count100: this.readInt16(),
            count50: this.readInt16(),
            count300k: this.readInt16(),
            count100k: this.readInt16(),
            countMiss: this.readInt16()
        }
        this.score = this.readInt32();
        this.maxCombo = this.readInt16();
        this.perfect = this.readByte();
        this.mods = this.readInt32();
        this.healthbar = this.parseHealthbar(this.readString());
        let a = (BigInt(this.readInt64()) - EPOCH) / 10000n; this.timestamp = new Date(Number(a))

        let replayLength = this.readInt32();
        let replayBinary = this.readBinary(replayLength);
        this.replayData = await new Promise(r => {
            decompress(replayBinary, 0, buf => r(buf.toString()))
        })
        return this;
    }
}

const EPOCH = 621355968000000000n
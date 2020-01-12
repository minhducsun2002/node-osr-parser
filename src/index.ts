import { decompress } from 'lzma-native'
import { Uint64LE } from 'int64-buffer'
import { UnsignedLEB128 } from '@minhducsun2002/leb128'
interface AccuracyCount {
    count300: number;
    count100: number;
    count50: number;
    count300k: number;
    count100k: number;
    countMiss: number;
}

/**
 * Class representing a replay.
 * @see https://osu.ppy.sh/help/wiki/osu!_File_Formats/Osr_(file_format)/
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
    /**
     * Game version which generated this replay.
     */
    version: number;
    /**
     * MD5 hash of the beatmap played.
     */
    md5map: string;
    /**
     * Player name.
     */
    player: string;
    /**
     * Replay MD5 hash (includes certain properties of the replay)
     */
    md5replay: string;
    accuracies: AccuracyCount;
    score: number;
    maxCombo: number;
    perfect: number;
    mods: number;
    healthbar: string;
    timestamp: Date;
    replayData: string;
    scoreID: number;


    private buffer: Buffer;
    private offset: number;

    constructor(content: Buffer) {
        this.buffer = content;
        // initialize all attribs
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
    }

    private readByte() {
        const out = this.buffer.slice(this.offset, this.offset + 1);
        this.offset++;
        return out.readUInt8(0);
    }

    private readInt16() {
        const out = this.buffer.slice(this.offset, this.offset + 2);
        this.offset += 2;
        return out.readInt16LE(0);
    }

    private readInt32() {
        const out = this.buffer.slice(this.offset, this.offset + 4);
        this.offset += 4;
        return out.readInt32LE(0);
    }

    private readInt64() {
        const out = this.buffer.slice(this.offset, this.offset + 8);
        this.offset += 8;
        return new Uint64LE(out).toNumber();
    }

    private readString() {
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
        const binary = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return binary;
    }

    async parse() {
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
        this.healthbar = this.readString();
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
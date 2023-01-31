import { readFileSync, readdirSync } from 'fs';
import { join } from 'path'
import { Replay } from '../../src/index';

const base = './tests/minhducsun2002/test-resources';
const files = readdirSync(base).sort();

const hashes = ['2857c41637b6c80d2c9c7fb5a9392635', '372add2cc4e5fdf0cc6e1fbd4c56e3b5', 'd7005fd8756921a412510b9c6f1fc6a2'];
const combos = [313, 468, 440];
const scores = [1673661, 3553683, 1376219];
const versions = [20200104, 20191227, 20190410];

let replays : { r: Replay, beatmap: string, combo: number, score: number, version: number }[] = files.map(
    (f, i) => {
        let r = new Replay(readFileSync(join(base, f)));
        return { r, beatmap: hashes[i], combo: combos[i], score: scores[i], version: versions[i] };
    }
);
beforeAll(async () => {
    let r = replays.map(f => f.r.deserialize());
    await Promise.all(r);
})

describe.each(replays)('Replay %#', (record) => {
    let { r, beatmap, combo, score, version } = record;
    test('is played by minhducsun2002', () => {
        expect(r.player).toBe('minhducsun2002');
    })

    test('is created in or after October 2018', () => {
        expect(r.timestamp.valueOf()).toBeGreaterThanOrEqual(1538352000)
    })

    test('has beatmap hash parsed correctly', () => {
        expect(r.md5map).toBe(beatmap);
    })

    test('has max combo parsed correctly', () => {
        expect(r.maxCombo).toBe(combo);
    })

    test('has score parsed correctly', () => {
        expect(r.score).toBe(score);
    })

    test('has version parsed correctly', () => {
        expect(r.version).toBe(version);
    })

    test('has replay data parsed correctly', () => {
        let events = r.replayData.split(',').slice(0, 100); // make it fast
        for (let event of events) {
            let [w, x, y, z] = event.split('|').map(a => +a);
            expect(typeof w).not.toBeNaN();
            expect(typeof x).not.toBeNaN();
            expect(typeof y).not.toBeNaN();
            expect(typeof z).not.toBeNaN();
        }
    })
})
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path'
import { Replay } from '../../src/index';

const base = './tests/minhducsun2002/test-resources';
const files = readdirSync(base);

test(`All replays are played by minhducsun2002`, () => {
    files.map(async f => {
        const { player } = await new Replay(
            readFileSync(join(base, f))
        ).parse();
        expect(player).toBe('minhducsun2002')
    })
})

test(`All replays are created in or after October 2018`, () => {
    files.map(async f => {
        const { timestamp } = await new Replay(
            readFileSync(join(base, f))
        ).parse();
        expect(timestamp.valueOf()).toBeGreaterThanOrEqual(1538352000)
    })
})

test(`All replays' respective beatmap hashes are parsed correctly`, () => {
    const hashes = [
        '2857c41637b6c80d2c9c7fb5a9392635',
        '372add2cc4e5fdf0cc6e1fbd4c56e3b5',
        'd7005fd8756921a412510b9c6f1fc6a2'
    ]
    files.sort().map(async (f, i) => {
        const { md5map } = await new Replay(
            readFileSync(join(base, f))
        ).parse();
        expect(md5map).toBe(hashes[i])
    })
})
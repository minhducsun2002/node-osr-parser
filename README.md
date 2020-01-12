# `node-osr-parser`
###### Another library to parse osu! replays

### Usage
```ts
import { Replay } from 'node-osr-parser';
// CommonJS
const { Replay } = require('node-osr-parser');

const a : Buffer = readFileSync('your/osr/file');
new Replay(a).parse().then(replay => console.log(replay.player));
```

### License
MIT license. See [here](./LICENSE).
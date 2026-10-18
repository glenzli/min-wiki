// Content-owned command bridge. The renderer and build implementation live in wiki-reader.
import {access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {homedir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const [command,...args]=process.argv.slice(2);
if(!['serve','check','build'].includes(command))throw new Error('Use serve, check or build.');
const candidates=process.env.WIKI_READER_ROOT
  ?[join(resolve(process.env.WIKI_READER_ROOT),'bin/wiki-reader.js')]
  :[join(root,'node_modules/@glenzli/wiki-reader/bin/wiki-reader.js'),join(root,'../wiki-reader/bin/wiki-reader.js'),join(homedir(),'lab/wiki-reader/bin/wiki-reader.js')];
let executable;
for(const candidate of candidates)if(await access(candidate).then(()=>true,()=>false)){executable=candidate;break;}
if(!executable)throw new Error('Check out the independent glenzli/wiki-reader project, run npm ci there, then set WIKI_READER_ROOT to its directory.');
const child=spawn(process.execPath,[executable,command,root,...args],{cwd:root,stdio:'inherit'});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',(code,signal)=>{process.exitCode=code??(signal==='SIGINT'?130:1);});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>child.kill(signal));

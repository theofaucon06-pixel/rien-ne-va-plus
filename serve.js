// Website + private multiplayer rooms. Node 20+, no dependencies.
const os = require('node:os');
import('./server.mjs').then(({createApp}) => {
  const app=createApp(), port=Number(process.env.PORT||8787);
  app.server.listen(port,'0.0.0.0',()=>{
    console.log(`Rien ne va plus → http://localhost:${port}`);
    for(const entries of Object.values(os.networkInterfaces())) for(const n of entries||[]) if(n.family==='IPv4'&&!n.internal) console.log(`Même Wi-Fi → http://${n.address}:${port}`);
  });
  app.server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Le port ${port} est occupé. Choisis un autre PORT.`:e.message);process.exitCode=1;});
  for(const s of ['SIGINT','SIGTERM']) process.on(s,()=>app.close().then(()=>process.exit(0)));
}).catch(e=>{console.error(e);process.exitCode=1;});

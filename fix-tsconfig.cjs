const fs = require("fs");
const cfg = JSON.parse(fs.readFileSync("E:/Deployment/OpenAi/jingzong/tsconfig.app.json", "utf8"));
cfg.compilerOptions.noImplicitAny = false;
fs.writeFileSync("E:/Deployment/OpenAi/jingzong/tsconfig.app.json", JSON.stringify(cfg, null, 2), "utf8");
console.log("ok");

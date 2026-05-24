const fs = require("fs");

// Fix index.ts - DEPARTMENTS import issue
let p = "E:/Deployment/OpenAi/jingzong/src/moduleConfig/index.ts";
let d = fs.readFileSync(p, "utf8");
console.log("Current index.ts:", d);
fs.writeFileSync(p, d, "utf8");

// Check what departments.ts exports
p = "E:/Deployment/OpenAi/jingzong/src/moduleConfig/departments.ts";
d = fs.readFileSync(p, "utf8");
let exports = d.match(/export const (\w+)/g);
console.log("Exports from departments:", exports);

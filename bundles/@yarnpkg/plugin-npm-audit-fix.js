/* eslint-disable */
//prettier-ignore
module.exports = {
name: "@yarnpkg/plugin-npm-audit-fix",
factory: function (require) {
var plugin=(()=>{var n=Object.defineProperty;var c=Object.getOwnPropertyDescriptor;var p=Object.getOwnPropertyNames;var u=Object.prototype.hasOwnProperty;var a=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(o,t)=>(typeof require<"u"?require:o)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw new Error('Dynamic require of "'+e+'" is not supported')});var g=(e,o)=>{for(var t in o)n(e,t,{get:o[t],enumerable:!0})},h=(e,o,t,s)=>{if(o&&typeof o=="object"||typeof o=="function")for(let i of p(o))!u.call(e,i)&&i!==t&&n(e,i,{get:()=>o[i],enumerable:!(s=c(o,i))||s.enumerable});return e};var f=e=>h(n({},"__esModule",{value:!0}),e);var x={};g(x,{default:()=>d});var r=a("@yarnpkg/cli"),m=a("clipanion"),l=class extends r.BaseCommand{constructor(){super(...arguments);this.name=m.Option.String("--name","John Doe",{description:"Your name"})}execute(){return console.log(`Hello ${this.name}!`),Promise.resolve()}};l.paths=[["hello","world"]];var b={hooks:{afterAllInstalled:()=>{console.log("What a great install, am I right?")}},commands:[l]},d=b;return f(x);})();
return plugin;
}
};

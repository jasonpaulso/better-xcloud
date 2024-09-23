#!/usr/bin/env bun
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var promises_1 = require("node:fs/promises");
var node_util_1 = require("node:util");
var typescript_1 = require("typescript");
// @ts-ignore
var header_script_txt_1 = require("./src/assets/header_script.txt");
// @ts-ignore
var header_meta_txt_1 = require("./src/assets/header_meta.txt");
var node_console_1 = require("node:console");
var eslint_1 = require("eslint");
var BuildTarget;
(function (BuildTarget) {
    BuildTarget["ALL"] = "all";
    BuildTarget["ANDROID_APP"] = "android-app";
    BuildTarget["MOBILE"] = "mobile";
    BuildTarget["WEBOS"] = "webos";
})(BuildTarget || (BuildTarget = {}));
var postProcess = function (str) {
    // Unescape unicode charaters
    str = unescape((str.replace(/\\u/g, '%u')));
    // Replace \x00 to normal character
    str = str.replaceAll(/\\x[A-F0-9]{2}/g, function (e) { return String.fromCharCode(parseInt(e.substring(2), 16)); });
    // Replace "globalThis." with "var";
    str = str.replaceAll('globalThis.', 'var ');
    // Remove enum's inlining comments
    str = str.replaceAll(/ \/\* [A-Z0-9_]+ \*\//g, '');
    str = str.replaceAll('/* @__PURE__ */ ', '');
    // Remove comments from import
    str = str.replaceAll(/\/\/ src.*\n/g, '');
    // Add ADDITIONAL CODE block
    str = str.replace('var DEFAULT_FLAGS', '\n/* ADDITIONAL CODE */\n\nvar DEFAULT_FLAGS');
    // Minify SVG
    str = str.replaceAll(/= "(<svg.*)";/g, function (match) {
        match = match.replaceAll(/\\n*\s*/g, '');
        return match;
    });
    (0, node_console_1.assert)(str.includes('/* ADDITIONAL CODE */'));
    (0, node_console_1.assert)(str.includes('window.BX_EXPOSED = BxExposed'));
    (0, node_console_1.assert)(str.includes('window.BxEvent = BxEvent'));
    (0, node_console_1.assert)(str.includes('window.BX_FETCH = window.fetch'));
    return str;
};
var build = function (target_1, version_1) {
    var args_1 = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args_1[_i - 2] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([target_1, version_1], args_1, true), void 0, function (target, version, config) {
        var startTime, outputScriptName, outputMetaName, outDir, output, path, result, _a, scriptHeader, eslint, results;
        if (config === void 0) { config = {}; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('-- Target:', target);
                    startTime = performance.now();
                    outputScriptName = 'better-xcloud';
                    if (target !== BuildTarget.ALL) {
                        outputScriptName += ".".concat(target);
                    }
                    outputMetaName = outputScriptName;
                    outputScriptName += '.user.js';
                    outputMetaName += '.meta.js';
                    outDir = './dist';
                    return [4 /*yield*/, Bun.build({
                            entrypoints: ['src/index.ts'],
                            outdir: outDir,
                            naming: outputScriptName,
                            minify: {
                                syntax: true,
                            },
                            define: {
                                'Bun.env.BUILD_TARGET': JSON.stringify(target),
                                'Bun.env.SCRIPT_VERSION': JSON.stringify(version),
                            },
                        })];
                case 1:
                    output = _b.sent();
                    if (!output.success) {
                        console.log(output);
                        process.exit(1);
                    }
                    path = output.outputs[0].path;
                    _a = postProcess;
                    return [4 /*yield*/, (0, promises_1.readFile)(path, 'utf-8')];
                case 2:
                    result = _a.apply(void 0, [_b.sent()]);
                    scriptHeader = header_script_txt_1.default.replace('[[VERSION]]', version);
                    // Save to script
                    return [4 /*yield*/, Bun.write(path, scriptHeader + result)];
                case 3:
                    // Save to script
                    _b.sent();
                    if (!!version.includes('beta')) return [3 /*break*/, 5];
                    return [4 /*yield*/, Bun.write(outDir + '/' + outputMetaName, header_meta_txt_1.default.replace('[[VERSION]]', version))];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5:
                    eslint = new eslint_1.ESLint();
                    return [4 /*yield*/, eslint.lintFiles([path])];
                case 6:
                    results = _b.sent();
                    results[0].messages.forEach(function (msg) {
                        console.error("".concat(path, "#").concat(msg.line, ": ").concat(msg.message));
                    });
                    console.log("---- [".concat(target, "] done in ").concat(performance.now() - startTime, " ms"));
                    console.log("---- [".concat(target, "] ").concat(new Date()));
                    return [2 /*return*/];
            }
        });
    });
};
var buildTargets = [
    BuildTarget.ALL,
    // BuildTarget.ANDROID_APP,
    // BuildTarget.MOBILE,
    // BuildTarget.WEBOS,
];
var _a = (0, node_util_1.parseArgs)({
    args: Bun.argv,
    options: {
        version: {
            type: 'string',
        },
    },
    strict: true,
    allowPositionals: true,
}), values = _a.values, positionals = _a.positionals;
if (!values['version']) {
    console.log('Missing --version param');
    typescript_1.sys.exit(-1);
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var config, _i, buildTargets_1, target;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    config = {};
                    console.log('Building: ', values['version']);
                    _i = 0, buildTargets_1 = buildTargets;
                    _a.label = 1;
                case 1:
                    if (!(_i < buildTargets_1.length)) return [3 /*break*/, 4];
                    target = buildTargets_1[_i];
                    return [4 /*yield*/, build(target, values['version'], config)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log('\n** Press Enter to build or Esc to exit');
                    return [2 /*return*/];
            }
        });
    });
}
function onKeyPress(data) {
    var keyCode = data[0];
    if (keyCode === 13) { // Enter key
        main();
    }
    else if (keyCode === 27) { // Esc key
        process.exit(0);
    }
}
main();
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', onKeyPress);

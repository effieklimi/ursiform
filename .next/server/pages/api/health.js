"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/api/health";
exports.ids = ["pages/api/health"];
exports.modules = {

/***/ "(api)/./pages/api/health.ts":
/*!*****************************!*\
  !*** ./pages/api/health.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ handler)\n/* harmony export */ });\nfunction handler(req, res) {\n    if (req.method !== \"GET\") {\n        res.setHeader(\"Allow\", [\n            \"GET\"\n        ]);\n        res.status(405).end(`Method ${req.method} Not Allowed`);\n        return;\n    }\n    res.status(200).json({\n        status: \"ok\",\n        timestamp: new Date().toISOString()\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwaSkvLi9wYWdlcy9hcGkvaGVhbHRoLnRzLmpzIiwibWFwcGluZ3MiOiI7Ozs7QUFPZSxTQUFTQSxPQUFPLENBQzdCQyxHQUFtQixFQUNuQkMsR0FBb0MsRUFDcEM7SUFDQSxJQUFJRCxHQUFHLENBQUNFLE1BQU0sS0FBSyxLQUFLLEVBQUU7UUFDeEJELEdBQUcsQ0FBQ0UsU0FBUyxDQUFDLE9BQU8sRUFBRTtZQUFDLEtBQUs7U0FBQyxDQUFDLENBQUM7UUFDaENGLEdBQUcsQ0FBQ0csTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUVMLEdBQUcsQ0FBQ0UsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDeEQsT0FBTztJQUNULENBQUM7SUFFREQsR0FBRyxDQUFDRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUNFLElBQUksQ0FBQztRQUNuQkYsTUFBTSxFQUFFLElBQUk7UUFDWkcsU0FBUyxFQUFFLElBQUlDLElBQUksRUFBRSxDQUFDQyxXQUFXLEVBQUU7S0FDcEMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXMiOlsid2VicGFjazovL3llYXJuLy4vcGFnZXMvYXBpL2hlYWx0aC50cz8yYjFjIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgTmV4dEFwaVJlcXVlc3QsIE5leHRBcGlSZXNwb25zZSB9IGZyb20gXCJuZXh0XCI7XG5cbnR5cGUgSGVhbHRoUmVzcG9uc2UgPSB7XG4gIHN0YXR1czogc3RyaW5nO1xuICB0aW1lc3RhbXA6IHN0cmluZztcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGhhbmRsZXIoXG4gIHJlcTogTmV4dEFwaVJlcXVlc3QsXG4gIHJlczogTmV4dEFwaVJlc3BvbnNlPEhlYWx0aFJlc3BvbnNlPlxuKSB7XG4gIGlmIChyZXEubWV0aG9kICE9PSBcIkdFVFwiKSB7XG4gICAgcmVzLnNldEhlYWRlcihcIkFsbG93XCIsIFtcIkdFVFwiXSk7XG4gICAgcmVzLnN0YXR1cyg0MDUpLmVuZChgTWV0aG9kICR7cmVxLm1ldGhvZH0gTm90IEFsbG93ZWRgKTtcbiAgICByZXR1cm47XG4gIH1cblxuICByZXMuc3RhdHVzKDIwMCkuanNvbih7XG4gICAgc3RhdHVzOiBcIm9rXCIsXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gIH0pO1xufVxuIl0sIm5hbWVzIjpbImhhbmRsZXIiLCJyZXEiLCJyZXMiLCJtZXRob2QiLCJzZXRIZWFkZXIiLCJzdGF0dXMiLCJlbmQiLCJqc29uIiwidGltZXN0YW1wIiwiRGF0ZSIsInRvSVNPU3RyaW5nIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(api)/./pages/api/health.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(api)/./pages/api/health.ts"));
module.exports = __webpack_exports__;

})();
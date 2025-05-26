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
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "./node_modules/next/dist/pages/_app.js":
/*!**********************************************!*\
  !*** ./node_modules/next/dist/pages/_app.js ***!
  \**********************************************/
/***/ ((module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({\n    value: true\n}));\nObject.defineProperty(exports, \"default\", ({\n    enumerable: true,\n    get: function() {\n        return App;\n    }\n}));\nconst _interop_require_default = __webpack_require__(/*! @swc/helpers/_/_interop_require_default */ \"./node_modules/@swc/helpers/cjs/_interop_require_default.cjs\");\nconst _jsxruntime = __webpack_require__(/*! react/jsx-runtime */ \"react/jsx-runtime\");\nconst _react = /*#__PURE__*/ _interop_require_default._(__webpack_require__(/*! react */ \"react\"));\nconst _utils = __webpack_require__(/*! ../shared/lib/utils */ \"../shared/lib/utils\");\n/**\n * `App` component is used for initialize of pages. It allows for overwriting and full control of the `page` initialization.\n * This allows for keeping state between navigation, custom error handling, injecting additional data.\n */ async function appGetInitialProps(param) {\n    let { Component , ctx  } = param;\n    const pageProps = await (0, _utils.loadGetInitialProps)(Component, ctx);\n    return {\n        pageProps\n    };\n}\nclass App extends _react.default.Component {\n    render() {\n        const { Component , pageProps  } = this.props;\n        return /*#__PURE__*/ (0, _jsxruntime.jsx)(Component, {\n            ...pageProps\n        });\n    }\n}\nApp.origGetInitialProps = appGetInitialProps;\nApp.getInitialProps = appGetInitialProps;\nif ((typeof exports.default === \"function\" || typeof exports.default === \"object\" && exports.default !== null) && typeof exports.default.__esModule === \"undefined\") {\n    Object.defineProperty(exports.default, \"__esModule\", {\n        value: true\n    });\n    Object.assign(exports.default, exports);\n    module.exports = exports.default;\n} //# sourceMappingURL=_app.js.map\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L3BhZ2VzL19hcHAuanMuanMiLCJtYXBwaW5ncyI6IkFBQWE7QUFDYkEsOENBQTZDO0lBQ3pDRyxLQUFLLEVBQUUsSUFBSTtDQUNkLEVBQUMsQ0FBQztBQUNISCwyQ0FBMEM7SUFDdENJLFVBQVUsRUFBRSxJQUFJO0lBQ2hCQyxHQUFHLEVBQUUsV0FBVztRQUNaLE9BQU9DLEdBQUcsQ0FBQztJQUNmLENBQUM7Q0FDSixFQUFDLENBQUM7QUFDSCxNQUFNQyx3QkFBd0IsR0FBR0MsbUJBQU8sQ0FBQyw2R0FBeUMsQ0FBQztBQUNuRixNQUFNQyxXQUFXLEdBQUdELG1CQUFPLENBQUMsNENBQW1CLENBQUM7QUFDaEQsTUFBTUUsTUFBTSxHQUFHLFdBQVcsR0FBR0gsd0JBQXdCLENBQUNJLENBQUMsQ0FBQ0gsbUJBQU8sQ0FBQyxvQkFBTyxDQUFDLENBQUM7QUFDekUsTUFBTUksTUFBTSxHQUFHSixtQkFBTyxDQUFDLGdEQUFxQixDQUFDO0FBQzdDOzs7Q0FHQyxHQUFHLGVBQWVLLGtCQUFrQixDQUFDQyxLQUFLLEVBQUU7SUFDekMsSUFBSSxFQUFFQyxTQUFTLEdBQUVDLEdBQUcsR0FBRSxHQUFHRixLQUFLO0lBQzlCLE1BQU1HLFNBQVMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFTCxNQUFNLENBQUNNLG1CQUFtQixFQUFFSCxTQUFTLEVBQUVDLEdBQUcsQ0FBQztJQUN2RSxPQUFPO1FBQ0hDLFNBQVM7S0FDWixDQUFDO0FBQ04sQ0FBQztBQUNELE1BQU1YLEdBQUcsU0FBU0ksTUFBTSxDQUFDUyxPQUFPLENBQUNKLFNBQVM7SUFDdENLLE1BQU0sR0FBRztRQUNMLE1BQU0sRUFBRUwsU0FBUyxHQUFFRSxTQUFTLEdBQUUsR0FBRyxJQUFJLENBQUNJLEtBQUs7UUFDM0MsT0FBcUIsV0FBSCxHQUFJLEVBQUMsRUFBRVosV0FBVyxDQUFDYSxHQUFHLEVBQUVQLFNBQVMsRUFBRTtZQUNqRCxHQUFHRSxTQUFTO1NBQ2YsQ0FBQyxDQUFDO0lBQ1A7Q0FDSDtBQUNEWCxHQUFHLENBQUNpQixtQkFBbUIsR0FBR1Ysa0JBQWtCLENBQUM7QUFDN0NQLEdBQUcsQ0FBQ2tCLGVBQWUsR0FBR1gsa0JBQWtCLENBQUM7QUFFekMsSUFBSSxDQUFDLE9BQU9YLE9BQU8sQ0FBQ2lCLE9BQU8sS0FBSyxVQUFVLElBQUssT0FBT2pCLE9BQU8sQ0FBQ2lCLE9BQU8sS0FBSyxRQUFRLElBQUlqQixPQUFPLENBQUNpQixPQUFPLEtBQUssSUFBSSxDQUFDLElBQUssT0FBT2pCLE9BQU8sQ0FBQ2lCLE9BQU8sQ0FBQ00sVUFBVSxLQUFLLFdBQVcsRUFBRTtJQUNyS3pCLE1BQU0sQ0FBQ0MsY0FBYyxDQUFDQyxPQUFPLENBQUNpQixPQUFPLEVBQUUsWUFBWSxFQUFFO1FBQUVoQixLQUFLLEVBQUUsSUFBSTtLQUFFLENBQUMsQ0FBQztJQUN0RUgsTUFBTSxDQUFDMEIsTUFBTSxDQUFDeEIsT0FBTyxDQUFDaUIsT0FBTyxFQUFFakIsT0FBTyxDQUFDLENBQUM7SUFDeEN5QixNQUFNLENBQUN6QixPQUFPLEdBQUdBLE9BQU8sQ0FBQ2lCLE9BQU8sQ0FBQztBQUNuQyxDQUFDLENBRUQsZ0NBQWdDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8veWVhcm4vLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L3BhZ2VzL19hcHAuanM/OTYxZCJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcImRlZmF1bHRcIiwge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFwcDtcbiAgICB9XG59KTtcbmNvbnN0IF9pbnRlcm9wX3JlcXVpcmVfZGVmYXVsdCA9IHJlcXVpcmUoXCJAc3djL2hlbHBlcnMvXy9faW50ZXJvcF9yZXF1aXJlX2RlZmF1bHRcIik7XG5jb25zdCBfanN4cnVudGltZSA9IHJlcXVpcmUoXCJyZWFjdC9qc3gtcnVudGltZVwiKTtcbmNvbnN0IF9yZWFjdCA9IC8qI19fUFVSRV9fKi8gX2ludGVyb3BfcmVxdWlyZV9kZWZhdWx0Ll8ocmVxdWlyZShcInJlYWN0XCIpKTtcbmNvbnN0IF91dGlscyA9IHJlcXVpcmUoXCIuLi9zaGFyZWQvbGliL3V0aWxzXCIpO1xuLyoqXG4gKiBgQXBwYCBjb21wb25lbnQgaXMgdXNlZCBmb3IgaW5pdGlhbGl6ZSBvZiBwYWdlcy4gSXQgYWxsb3dzIGZvciBvdmVyd3JpdGluZyBhbmQgZnVsbCBjb250cm9sIG9mIHRoZSBgcGFnZWAgaW5pdGlhbGl6YXRpb24uXG4gKiBUaGlzIGFsbG93cyBmb3Iga2VlcGluZyBzdGF0ZSBiZXR3ZWVuIG5hdmlnYXRpb24sIGN1c3RvbSBlcnJvciBoYW5kbGluZywgaW5qZWN0aW5nIGFkZGl0aW9uYWwgZGF0YS5cbiAqLyBhc3luYyBmdW5jdGlvbiBhcHBHZXRJbml0aWFsUHJvcHMocGFyYW0pIHtcbiAgICBsZXQgeyBDb21wb25lbnQsIGN0eCB9ID0gcGFyYW07XG4gICAgY29uc3QgcGFnZVByb3BzID0gYXdhaXQgKDAsIF91dGlscy5sb2FkR2V0SW5pdGlhbFByb3BzKShDb21wb25lbnQsIGN0eCk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcGFnZVByb3BzXG4gICAgfTtcbn1cbmNsYXNzIEFwcCBleHRlbmRzIF9yZWFjdC5kZWZhdWx0LkNvbXBvbmVudCB7XG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zdCB7IENvbXBvbmVudCwgcGFnZVByb3BzIH0gPSB0aGlzLnByb3BzO1xuICAgICAgICByZXR1cm4gLyojX19QVVJFX18qLyAoMCwgX2pzeHJ1bnRpbWUuanN4KShDb21wb25lbnQsIHtcbiAgICAgICAgICAgIC4uLnBhZ2VQcm9wc1xuICAgICAgICB9KTtcbiAgICB9XG59XG5BcHAub3JpZ0dldEluaXRpYWxQcm9wcyA9IGFwcEdldEluaXRpYWxQcm9wcztcbkFwcC5nZXRJbml0aWFsUHJvcHMgPSBhcHBHZXRJbml0aWFsUHJvcHM7XG5cbmlmICgodHlwZW9mIGV4cG9ydHMuZGVmYXVsdCA9PT0gJ2Z1bmN0aW9uJyB8fCAodHlwZW9mIGV4cG9ydHMuZGVmYXVsdCA9PT0gJ29iamVjdCcgJiYgZXhwb3J0cy5kZWZhdWx0ICE9PSBudWxsKSkgJiYgdHlwZW9mIGV4cG9ydHMuZGVmYXVsdC5fX2VzTW9kdWxlID09PSAndW5kZWZpbmVkJykge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cy5kZWZhdWx0LCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG4gIE9iamVjdC5hc3NpZ24oZXhwb3J0cy5kZWZhdWx0LCBleHBvcnRzKTtcbiAgbW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzLmRlZmF1bHQ7XG59XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPV9hcHAuanMubWFwIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiZW51bWVyYWJsZSIsImdldCIsIkFwcCIsIl9pbnRlcm9wX3JlcXVpcmVfZGVmYXVsdCIsInJlcXVpcmUiLCJfanN4cnVudGltZSIsIl9yZWFjdCIsIl8iLCJfdXRpbHMiLCJhcHBHZXRJbml0aWFsUHJvcHMiLCJwYXJhbSIsIkNvbXBvbmVudCIsImN0eCIsInBhZ2VQcm9wcyIsImxvYWRHZXRJbml0aWFsUHJvcHMiLCJkZWZhdWx0IiwicmVuZGVyIiwicHJvcHMiLCJqc3giLCJvcmlnR2V0SW5pdGlhbFByb3BzIiwiZ2V0SW5pdGlhbFByb3BzIiwiX19lc01vZHVsZSIsImFzc2lnbiIsIm1vZHVsZSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./node_modules/next/dist/pages/_app.js\n");

/***/ }),

/***/ "../shared/lib/utils":
/*!************************************************!*\
  !*** external "next/dist/shared/lib/utils.js" ***!
  \************************************************/
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/utils.js");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

module.exports = require("react");

/***/ }),

/***/ "react/jsx-runtime":
/*!************************************!*\
  !*** external "react/jsx-runtime" ***!
  \************************************/
/***/ ((module) => {

module.exports = require("react/jsx-runtime");

/***/ }),

/***/ "./node_modules/@swc/helpers/cjs/_interop_require_default.cjs":
/*!********************************************************************!*\
  !*** ./node_modules/@swc/helpers/cjs/_interop_require_default.cjs ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, exports) => {

eval("\n\nfunction _interop_require_default(obj) {\n    return obj && obj.__esModule ? obj : { default: obj };\n}\nexports._ = _interop_require_default;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9ub2RlX21vZHVsZXMvQHN3Yy9oZWxwZXJzL2Nqcy9faW50ZXJvcF9yZXF1aXJlX2RlZmF1bHQuY2pzLmpzIiwibWFwcGluZ3MiOiJBQUFhOztBQUViO0FBQ0EsMkNBQTJDO0FBQzNDO0FBQ0EsU0FBUyIsInNvdXJjZXMiOlsid2VicGFjazovL3llYXJuLy4vbm9kZV9tb2R1bGVzL0Bzd2MvaGVscGVycy9janMvX2ludGVyb3BfcmVxdWlyZV9kZWZhdWx0LmNqcz84NWIxIl0sInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBfaW50ZXJvcF9yZXF1aXJlX2RlZmF1bHQob2JqKSB7XG4gICAgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07XG59XG5leHBvcnRzLl8gPSBfaW50ZXJvcF9yZXF1aXJlX2RlZmF1bHQ7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./node_modules/@swc/helpers/cjs/_interop_require_default.cjs\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("./node_modules/next/dist/pages/_app.js"));
module.exports = __webpack_exports__;

})();
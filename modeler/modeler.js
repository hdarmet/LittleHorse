/**
 * Created by HDA3014 on 24/01/2016.
 */

var SVG = require("../svghandler.js").SVG;
var targetRuntime = require("../targetruntime.js").targetRuntime;
var modelEditor = require("./modeleditor.js").modelEditor;

var svg = SVG(targetRuntime());

var editor = modelEditor(svg);
editor.show("content");

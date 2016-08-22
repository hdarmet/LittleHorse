/**
 * Created by HDA3014 on 20/08/2016.
 */

var SVG = require("../svghandler.js").SVG;
var targetRuntime = require("../targetruntime.js").targetRuntime;
var play = require("../uscw/play.js").play;

var svg = SVG(targetRuntime());

var play = play(svg);
play.show("content");

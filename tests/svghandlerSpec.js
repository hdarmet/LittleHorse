/**
 * Created by HDA3014 on 11/03/2016.
 */
var assert = require('assert');
var testUtils = require('./testutils');
var targetRuntime = require('../targetRuntime').targetRuntime;
var mockRuntime = require('../runtimemock').mockRuntime;
var SVG = require('../svghandler').SVG;

var runtime;
var svg;
var inspect = testUtils.inspect;

describe('Little games', function() {

    describe('Little horses', function () {

        beforeEach(function () {
            runtime = mockRuntime();
            runtime.declareAnchor('content');
            svg = SVG(runtime);
        });

        it("creates a simple Rect", function () {
            var rect = new svg.Rect(100, 50);
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(rect);
            inspect(rect.component, {tag: 'rect', x: -50, y: -25, width: 100, height: 50});
            inspect(rect, {x: 0, y: 0, width: 100, height: 50});
            rect.position(20, 30).dimension(150, 100);
            inspect(rect.component, {tag: 'rect', x: -55, y: -20, width: 150, height: 100});
            inspect(rect, {x: 20, y: 30, width: 150, height: 100});
            rect.color([50, 70, 80], 4, [100, 110, 120]);
            inspect(rect.component, {fill: 'rgb(50,70,80)', "stroke-width": 4, stroke: 'rgb(100,110,120)'});
            assert.equal(rect.inside(-60, 0), false);
            assert.equal(rect.inside(-50, 0), true);
            assert.equal(rect.inside(90, 0), true);
            assert.equal(rect.inside(100, 0), false);
            assert.equal(rect.inside(0, -25), false);
            assert.equal(rect.inside(0, -15), true);
            assert.equal(rect.inside(0, 75), true);
            assert.equal(rect.inside(0, 85), false);
        });

        it("create a simple Circle", function() {
            var circle = new svg.Circle(50);
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(circle);
            inspect(circle.component, {tag:'circle', cx:0, cy:0, r:50});
            inspect(circle, {x:0, y:0, r:50});
            circle.position(20, 30).radius(60);
            inspect(circle.component, {tag:'circle', cx:20, cy:30, r:60});
            inspect(circle, {x:20, y:30, r:60});
            circle.color([50, 70, 80], 4, [100, 110, 120]);
            inspect(circle.component, {fill:'rgb(50,70,80)', "stroke-width":4, stroke:'rgb(100,110,120)'});
            assert.equal(circle.inside(-45, 30), false);
            assert.equal(circle.inside(-35, 30), true);
            assert.equal(circle.inside(75, 30), true);
            assert.equal(circle.inside(85, 30), false);
            assert.equal(circle.inside(20, -35), false);
            assert.equal(circle.inside(20, -25), true);
            assert.equal(circle.inside(20, 85),true);
            assert.equal(circle.inside(20, 95), false);
        });

        it("create a simple ellipse", function() {
            var ellipse = new svg.Ellipse(50, 60);
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(ellipse);
            inspect(ellipse.component, {tag:'ellipse', cx:0, cy:0, rx:50, ry:60});
            inspect(ellipse, {x:0, y:0, rx:50, ry:60});
            ellipse.position(20, 30).radius(60, 70);
            inspect(ellipse.component, {tag:'ellipse', cx:20, cy:30, rx:60, ry:70});
            inspect(ellipse, {x:20, y:30, rx:60, ry:70});
            ellipse.color([50, 70, 80], 4, [100, 110, 120]);
            inspect(ellipse.component, {fill:'rgb(50,70,80)', "stroke-width":4, stroke:'rgb(100,110,120)'});
            assert.equal(ellipse.inside(-45, 30), false);
            assert.equal(ellipse.inside(-35, 30), true);
            assert.equal(ellipse.inside(75, 30), true);
            assert.equal(ellipse.inside(85, 30), false);
            assert.equal(ellipse.inside(20, -45), false);
            assert.equal(ellipse.inside(20, -35), true);
            assert.equal(ellipse.inside(20, 95), true);
            assert.equal(ellipse.inside(20, 105), false);
        });

        it("create a simple triangle", function() {
            var tri = new svg.Triangle(50, 60, "N");
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(tri);
            inspect(tri.component, {tag:'polygon', points:'-25,30 25,30 0,-30'});
            inspect(tri, {dir:'N', width:50, height:60, points:[{x:-25,y:30}, {x:25,y:30}, {x:0,y:-30}]});
            tri.direction('S').dimension(70, 50);
            inspect(tri.component, {tag:'polygon', points:'-35,-25 35,-25 0,25'});
            inspect(tri, {dir:'S', width:70, height:50, points:[{x:-35,y:-25}, {x:35,y:-25}, {x:0,y:25}]});
            tri.direction('E');
            inspect(tri.component, {tag:'polygon', points:'-35,-25 -35,25 35,0'});
            tri.direction('W');
            inspect(tri.component, {tag:'polygon', points:'35,-25 35,25 -35,0'});
            tri.position(50, 60);
            inspect(tri.component, {tag:'polygon', points:'85,35 85,85 15,60'});
            tri.color([50, 70, 80], 4, [100, 110, 120]);
            inspect(tri.component, {fill:'rgb(50,70,80)', "stroke-width":4, stroke:'rgb(100,110,120)'});
            assert.equal(tri.inside(80, 50), true);
            assert.equal(tri.inside(20, 50), false);
        });

        it("create a simple polygon", function() {
            var poly = new svg.Polygon(50, 70).add(-10, 0).add(0, -10).add(10, 0).add(0, 10);
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(poly);
            inspect(poly.component, {tag:'polygon', points:' 40,70 50,60 60,70 50,80'});
            inspect(poly, {points:[{x:-10,y:0}, {x:0,y:-10}, {x:10,y:0}, {x:0,y:10}]});
            poly.position(50, 60);
            inspect(poly.component, {tag:'polygon', points:' 40,60 50,50 60,60 50,70'});
            poly.color([50, 70, 80], 4, [100, 110, 120]);
            inspect(poly.component, {fill:'rgb(50,70,80)', "stroke-width":4, stroke:'rgb(100,110,120)'});
            assert.equal(poly.inside(45, 60), true);
            assert.equal(poly.inside(45, 50), false);
        });

        it("create a simple hexagon", function() {
            var hex = new svg.Hexagon(100, "H");
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(hex);
            inspect(hex.component, {tag:'polygon', points:'-50,87 -100,0 -50,-87 50,-87 100,0 50,87'});
            inspect(hex, {dir:'H', baseWidth:100, points:[{x:-50,y:87}, {x:-100,y:0}, {x:-50,y:-87}, {x:50,y:-87}, {x:100,y:0}, {x:50,y:87}]});
            hex.direction('V').dimension(120);
            inspect(hex.component, {tag:'polygon', points:'104,-60 0,-120 -104,-60 -104,60 0,120 104,60'});
            inspect(hex, {dir:'V', baseWidth:120, points:[{x:104,y:-60}, {x:0,y:-120}, {x:-104,y:-60}, {x:-104,y:60}, {x:0,y:120}, {x:104,y:60}]});
            hex.position(50, 60);
            inspect(hex.component, {tag:'polygon', points:'104,-60 0,-120 -104,-60 -104,60 0,120 104,60'});
            hex.color([50, 70, 80], 4, [100, 110, 120]);
            inspect(hex.component, {fill:'rgb(50,70,80)', "stroke-width":4, stroke:'rgb(100,110,120)'});
            assert.equal(hex.inside(50, -80), true);
            assert.equal(hex.inside(50, -100), false);
        });

    });
});
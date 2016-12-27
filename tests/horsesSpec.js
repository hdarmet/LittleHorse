/**
 * Created by HDA3014 on 11/03/2016.
 */
let assert = require('assert');
let testUtils = require('./testutils');
let mockRuntime = require('../runtimemock').mockRuntime;
require('../enhancer').Enhance();
let SVG = require('../svghandler').SVG;

let play = require("../horses/horses").play;

let runtime;
let svg;

let retrieve = testUtils.retrieve;

function setDice() {
    runtime.setRandom(0.9);
}

function rollDice(dice) {
    for (let i=0; i<10; i++) {
        runtime.setRandom(dice/6-0.01);
        runtime.advance();
    }
    runtime.advance();
}

describe('Horses', function() {

    beforeEach(function () {
        runtime = mockRuntime();
        runtime.declareAnchor('content');
        svg = SVG(runtime);
    });

    it("shound deploy correctly", function (done) {
        //setDice();
        play(svg,
            {
                speed:20,
                horsesCount:2,
                players:{
                    green:{type:"human"},
                    red:{type:"bot"},
                    blue:{type:"bot"},
                    yellow:{type:"bot"}
                }
            });
        let root = runtime.anchor("content");
        let wilfried = retrieve(root, "[Wilfried].[image]");
        assert.equal(wilfried.text, "Azar&nbsp;!");
        done();
    });

    it("shound ignore a result other than 6 if no horse is on map", function (done) {
        //setDice();
        play(svg,
            {
                speed:20,
                horsesCount:2,
                players:{
                    green:{type:"human"},
                    red:{type:"bot"},
                    blue:{type:"bot"},
                    yellow:{type:"bot"}
                }
            });
        let root = runtime.anchor("content");
        let wilfried = retrieve(root, "[Wilfried].[image]");
        rollDice(6);
        assert.equal(wilfried.text, "Azar&nbsp;!");
        done();
    });
});
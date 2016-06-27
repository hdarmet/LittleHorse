/**
 * Created by HDA3014 on 11/03/2016.
 */
let assert = require('assert');
let testUtils = require('./testutils');
//let targetRuntime = require('../targetRuntime').targetRuntime;
let mockRuntime = require('../runtimemock').mockRuntime;
let SVG = require('../svghandler').SVG;

let playAzar = require("../azar/azar").playAzar;

let runtime;
let svg;

let retrieve = testUtils.retrieve;

function setDice() {
    runtime.setRandom(0.9);
    runtime.setRandom(0.9);
    runtime.setRandom(0.9);
}

function rollDice(die1, die2, die3) {
    for (let i=0; i<10; i++) {
        runtime.setRandom(die1/6-0.01);
        runtime.setRandom(die2/6-0.01);
        runtime.setRandom(die3/6-0.01);
        runtime.advance();
        runtime.advance();
        runtime.advance();
    }
    runtime.advance();
}

describe('Azar', function() {

    beforeEach(function () {
        runtime = mockRuntime();
        runtime.declareAnchor('content');
        svg = SVG(runtime);
    });

    it("plays azar and get a azar", function (done) {
        setDice();
        playAzar(svg,
            {
                speed:20
            });
        let root = runtime.anchor("content");
        let wilfried = retrieve(root, "[Wilfried].[image]");
        let wilfriedChance = retrieve(root, "[Wilfried].[chance]");
        let heweraldChance = retrieve(root, "[Hewerald].[chance]");
        assert.equal(wilfriedChance.text, "?");
        assert.equal(heweraldChance.text, "?");
        wilfried.event("click", {});
        rollDice(6, 6, 6);
        assert.equal(wilfriedChance.text, "Azar !");
        assert.equal(heweraldChance.text, "?");
        done();
    });

    it("plays azar and get a reazar", function (done) {
        setDice();
        playAzar(svg,
            {
                speed:20
            });
        let root = runtime.anchor("content");
        let wilfried = retrieve(root, "[Wilfried].[image]");
        let wilfriedChance = retrieve(root, "[Wilfried].[chance]");
        let heweraldChance = retrieve(root, "[Hewerald].[chance]");
        assert.equal(wilfriedChance.text, "?");
        assert.equal(heweraldChance.text, "?");
        wilfried.event("click", {});
        rollDice(4, 4, 4);
        assert.equal(wilfriedChance.text, "?");
        assert.equal(heweraldChance.text, "XII");
        wilfried.event("click", {});
        rollDice(1, 1, 1);
        assert.equal(wilfriedChance.text, "Reazar !");
        assert.equal(heweraldChance.text, "XII");
        done();
    });

    it("plays azar and get a draw", function (done) {
        setDice();
        playAzar(svg,
            {
                speed:20
            });
        let root = runtime.anchor("content");
        let wilfried = retrieve(root, "[Wilfried].[image]");
        let wilfriedChance = retrieve(root, "[Wilfried].[chance]");
        let heweraldChance = retrieve(root, "[Hewerald].[chance]");
        assert.equal(wilfriedChance.text, "?");
        assert.equal(heweraldChance.text, "?");
        wilfried.event("click", {});
        rollDice(4, 4, 4);
        assert.equal(wilfriedChance.text, "?");
        assert.equal(heweraldChance.text, "XII");
        wilfried.event("click", {});
        rollDice(3, 3, 6);
        assert.equal(wilfriedChance.text, "Same chance");
        assert.equal(heweraldChance.text, "XII");
        done();
    });

    it("plays azar and Wilfried get a chance", function (done) {
        setDice();
        playAzar(svg,
            {
                speed:20
            });
        let root = runtime.anchor("content");
        let wilfried = retrieve(root, "[Wilfried].[image]");
        let wilfriedChance = retrieve(root, "[Wilfried].[chance]");
        let heweraldChance = retrieve(root, "[Hewerald].[chance]");
        assert.equal(wilfriedChance.text, "?");
        assert.equal(heweraldChance.text, "?");
        wilfried.event("click", {});
        rollDice(4, 4, 4);
        assert.equal(wilfriedChance.text, "?");
        assert.equal(heweraldChance.text, "XII");
        wilfried.event("click", {});
        rollDice(3, 3, 5);
        assert.equal(wilfriedChance.text, "XI");
        assert.equal(heweraldChance.text, "XII");
        runtime.advance();
        rollDice(4, 4, 3);
        assert.equal(wilfriedChance.text, "XI : Chance !");
        assert.equal(heweraldChance.text, "XII");
        done();
    });

    it("plays azar and Hewerald get a chance", function (done) {
        setDice();
        playAzar(svg,
            {
                speed:20
            });
        let root = runtime.anchor("content");
        let wilfried = retrieve(root, "[Wilfried].[image]");
        let wilfriedChance = retrieve(root, "[Wilfried].[chance]");
        let heweraldChance = retrieve(root, "[Hewerald].[chance]");
        assert.equal(wilfriedChance.text, "?");
        assert.equal(heweraldChance.text, "?");
        wilfried.event("click", {});
        rollDice(4, 4, 4);
        assert.equal(wilfriedChance.text, "?");
        assert.equal(heweraldChance.text, "XII");
        wilfried.event("click", {});
        rollDice(3, 3, 5);
        assert.equal(wilfriedChance.text, "XI");
        assert.equal(heweraldChance.text, "XII");
        runtime.advance();
        rollDice(4, 5, 3);
        assert.equal(wilfriedChance.text, "XI");
        assert.equal(heweraldChance.text, "XII : Chance !");
        done();
    });

    it("plays some rounds", function (done) {
        setDice();
        playAzar(svg,
            {
                speed:20
            });
        let root = runtime.anchor("content");
        let wilfried = retrieve(root, "[Wilfried].[image]");
        let wilfriedChance = retrieve(root, "[Wilfried].[chance]");
        let heweraldChance = retrieve(root, "[Hewerald].[chance]");
        assert.equal(wilfriedChance.text, "?");
        assert.equal(heweraldChance.text, "?");
        wilfried.event("click", {});
        rollDice(4, 4, 4);
        assert.equal(wilfriedChance.text, "?");
        assert.equal(heweraldChance.text, "XII");
        wilfried.event("click", {});
        rollDice(3, 3, 5);
        assert.equal(wilfriedChance.text, "XI");
        assert.equal(heweraldChance.text, "XII");
        runtime.advance();
        rollDice(4, 1, 3);
        assert.equal(wilfriedChance.text, "XI");
        assert.equal(heweraldChance.text, "XII");
        wilfried.event("click", {});
        rollDice(2, 2, 3);
        assert.equal(wilfriedChance.text, "XI");
        assert.equal(heweraldChance.text, "XII");
        runtime.advance();
        rollDice(4, 2, 3);
        assert.equal(wilfriedChance.text, "XI");
        assert.equal(heweraldChance.text, "XII");
        wilfried.event("click", {});
        rollDice(2, 3, 3);
        assert.equal(wilfriedChance.text, "XI");
        assert.equal(heweraldChance.text, "XII");
        runtime.advance();
        rollDice(4, 5, 3);
        assert.equal(wilfriedChance.text, "XI");
        assert.equal(heweraldChance.text, "XII : Chance !");
        done();
    });

});
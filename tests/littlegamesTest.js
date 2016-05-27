/**
 * Created by HDA3014 on 11/03/2016.
 */
var assert = require('assert');
var testUtils = require('./testutils');
var targetRuntime = require('../targetRuntime').targetRuntime;
var mockRuntime = require('../runtimemock').mockRuntime;
var SVG = require('../svghandler').SVG;

var playHorses = require("../horses/horses").play;
var playMines = require("../mines/mines").playMines;
var playAzar = require("../azar/azar").playAzar;

var runtime;
var svg;

describe('Little games', function() {

    describe('Little horses', function () {

        beforeEach(function () {
            runtime = mockRuntime();
            runtime.declareAnchor('content');
            svg = SVG(runtime);
        });

        it("plays a complete horse game", function (done) {
            this.timeout(100000);
            testUtils.checkScenario(
                function() {
                    playHorses(svg,{
                        speed: 20,
                        horsesCount: 2,
                        players: {
                            green: {type: "bot"},
                            red: {type: "bot"},
                            blue: {type: "bot"},
                            yellow: {type: "bot"}
                        }
                    });
                },
                "./horses/completegame.json", 'content', runtime, done);
        });

        it("plays horses with human player", function (done) {
            this.timeout(100000);
            testUtils.checkScenario(
                function() {
                    playHorses(svg, {
                        speed: 20,
                        horsesCount: 2,
                        players: {
                            green: {type: "human"},
                            red: {type: "bot"},
                            blue: {type: "bot"},
                            yellow: {type: "bot"}
                        }
                    });
                },
                "./horses/startgame.json", 'content', runtime, done);
        });

    });

    describe('Mines', function () {
        beforeEach(function () {
            runtime = mockRuntime();
            runtime.declareAnchor('content');
            svg = SVG(runtime);
        });

        it("plays mines and loose", function (done) {
            this.timeout(100000);
            testUtils.checkScenario(
                function() {
                    playMines(svg, {
                        size: 10,
                        minePercent: 10
                    });
                },
                "./mines/lostmine.json", 'content', runtime, done);
        });

        it("plays mines and win", function (done) {
            this.timeout(100000);
            testUtils.checkScenario(
                function() {
                    playMines(svg, {
                        size: 10,
                        minePercent: 10
                    });
                },
                "./mines/winmine.json", 'content', runtime, done);
        });

    });

    describe('Azar', function () {
        beforeEach(function () {
            runtime = mockRuntime();
            runtime.declareAnchor('content');
            svg = SVG(runtime);
        });

        it("plays azar and get a azar", function (done) {
            this.timeout(100000);
            testUtils.checkScenario(
                function() {
                    playAzar(svg,
                        {
                            speed:20
                        });
                },
                "./azar/azar.json", 'content', runtime, done);
        });

        it("plays azar and get a reazar", function (done) {
            this.timeout(100000);
            testUtils.checkScenario(
                function() {
                    playAzar(svg,
                        {
                            speed:20
                        });
                },
                "./azar/reazar.json", 'content', runtime, done);
        });

        it("plays azar and get samechance", function (done) {
            this.timeout(100000);
            testUtils.checkScenario(
                function() {
                    playAzar(svg,
                        {
                            speed:20
                        });
                },
                "./azar/samechance.json", 'content', runtime, done);
        });

        it("plays azar and get a chance", function (done) {
            this.timeout(100000);
            testUtils.checkScenario(
                function() {
                    playAzar(svg,
                    {
                        speed:20
                    });
                },
                "./azar/chance.json", 'content', runtime, done);
        });

    });

});
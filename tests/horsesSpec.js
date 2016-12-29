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
    runtime.setRandom(dice/6-0.01);
    runtime.advance();
    runtime.advance();
}

describe('Horses', function() {

    beforeEach(function () {
        runtime = mockRuntime();
        runtime.declareAnchor('content');
        svg = SVG(runtime);
    });

    it("should deploy board correctly", function (done) {
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

        let testSquare = (id, result)=>{
            let square = retrieve(root, "[Board].[Square-"+id+"]");
            assert.equal(square.cx+" "+square.cy+" "+square.r+" "+square.fill+" "+square["stroke-width"]+" "+square.stroke, result);
        };

        testSquare("0", "450 870 25 rgb(0,255,0) 4 rgb(0,175,0)");
        testSquare("1", "390 870 25 rgb(0,255,0) 4 rgb(0,175,0)");
        testSquare("2", "390 810 25 rgb(0,255,0) 4 rgb(0,175,0)");
        testSquare("3", "390 750 25 rgb(0,255,0) 4 rgb(0,175,0)");
        testSquare("4", "390 690 25 rgb(0,255,0) 4 rgb(0,175,0)");
        testSquare("5", "390 630 25 rgb(0,255,0) 4 rgb(0,175,0)");
        testSquare("6", "390 570 25 rgb(0,255,0) 4 rgb(0,175,0)");
        testSquare("7", "390 510 25 rgb(0,255,0) 4 rgb(0,175,0)");
        testSquare("8", "330 510 25 rgb(0,255,0) 4 rgb(0,175,0)");
        testSquare("9", "270 510 25 rgb(0,255,0) 4 rgb(0,175,0)");
        testSquare("10", "210 510 25 rgb(0,255,0) 4 rgb(0,175,0)");
        testSquare("11", "150 510 25 rgb(0,255,0) 4 rgb(0,175,0)");
        testSquare("12", "90 510 25 rgb(0,255,0) 4 rgb(0,175,0)");
        testSquare("13", "30 510 25 rgb(0,255,0) 4 rgb(0,175,0)");

        testSquare("14", "30 450 25 rgb(255,204,0) 4 rgb(255,102,0)");
        testSquare("15", "30 390 25 rgb(255,204,0) 4 rgb(255,102,0)");
        testSquare("16", "90 390 25 rgb(255,204,0) 4 rgb(255,102,0)");
        testSquare("17", "150 390 25 rgb(255,204,0) 4 rgb(255,102,0)");
        testSquare("18", "210 390 25 rgb(255,204,0) 4 rgb(255,102,0)");
        testSquare("19", "270 390 25 rgb(255,204,0) 4 rgb(255,102,0)");
        testSquare("20", "330 390 25 rgb(255,204,0) 4 rgb(255,102,0)");
        testSquare("21", "390 390 25 rgb(255,204,0) 4 rgb(255,102,0)");
        testSquare("22", "390 330 25 rgb(255,204,0) 4 rgb(255,102,0)");
        testSquare("23", "390 270 25 rgb(255,204,0) 4 rgb(255,102,0)");
        testSquare("24", "390 210 25 rgb(255,204,0) 4 rgb(255,102,0)");
        testSquare("25", "390 150 25 rgb(255,204,0) 4 rgb(255,102,0)");
        testSquare("26", "390 90 25 rgb(255,204,0) 4 rgb(255,102,0)");
        testSquare("27", "390 30 25 rgb(255,204,0) 4 rgb(255,102,0)");

        testSquare("28", "450 30 25 rgb(0,200,200) 4 rgb(0,100,255)");
        testSquare("29", "510 30 25 rgb(0,200,200) 4 rgb(0,100,255)");
        testSquare("30", "510 90 25 rgb(0,200,200) 4 rgb(0,100,255)");
        testSquare("31", "510 150 25 rgb(0,200,200) 4 rgb(0,100,255)");
        testSquare("32", "510 210 25 rgb(0,200,200) 4 rgb(0,100,255)");
        testSquare("33", "510 270 25 rgb(0,200,200) 4 rgb(0,100,255)");
        testSquare("34", "510 330 25 rgb(0,200,200) 4 rgb(0,100,255)");
        testSquare("35", "510 390 25 rgb(0,200,200) 4 rgb(0,100,255)");
        testSquare("36", "570 390 25 rgb(0,200,200) 4 rgb(0,100,255)");
        testSquare("37", "630 390 25 rgb(0,200,200) 4 rgb(0,100,255)");
        testSquare("38", "690 390 25 rgb(0,200,200) 4 rgb(0,100,255)");
        testSquare("39", "750 390 25 rgb(0,200,200) 4 rgb(0,100,255)");
        testSquare("40", "810 390 25 rgb(0,200,200) 4 rgb(0,100,255)");
        testSquare("41", "870 390 25 rgb(0,200,200) 4 rgb(0,100,255)");

        testSquare("42", "870 450 25 rgb(255,100,100) 4 rgb(255,0,0)");
        testSquare("43", "870 510 25 rgb(255,100,100) 4 rgb(255,0,0)");
        testSquare("44", "810 510 25 rgb(255,100,100) 4 rgb(255,0,0)");
        testSquare("45", "750 510 25 rgb(255,100,100) 4 rgb(255,0,0)");
        testSquare("46", "690 510 25 rgb(255,100,100) 4 rgb(255,0,0)");
        testSquare("47", "630 510 25 rgb(255,100,100) 4 rgb(255,0,0)");
        testSquare("48", "570 510 25 rgb(255,100,100) 4 rgb(255,0,0)");
        testSquare("49", "510 510 25 rgb(255,100,100) 4 rgb(255,0,0)");
        testSquare("50", "510 570 25 rgb(255,100,100) 4 rgb(255,0,0)");
        testSquare("51", "510 630 25 rgb(255,100,100) 4 rgb(255,0,0)");
        testSquare("52", "510 690 25 rgb(255,100,100) 4 rgb(255,0,0)");
        testSquare("53", "510 750 25 rgb(255,100,100) 4 rgb(255,0,0)");
        testSquare("54", "510 810 25 rgb(255,100,100) 4 rgb(255,0,0)");
        testSquare("55", "510 870 25 rgb(255,100,100) 4 rgb(255,0,0)");

        let testScale = (team, result)=>{
            let scale = retrieve(root, "[Board].[Scale-"+team+"]");
            let frame = retrieve(scale, "[frame]");
            let value = retrieve(scale, "[value]");
            assert.equal(scale.transform+" "+frame.x+" "+frame.y+" "+frame.width+" "+frame.height+" "
                +frame.fill+" "+frame["stroke-width"]+" "+frame.stroke+" "
                +value.text+" "+value.fill, result);
        };

        testScale("G1", "translate(420 780) 5 5 50 50 rgb(0,200,0) 5 rgb(0,100,0) 1 rgb(0,100,0)");
        testScale("G2", "translate(420 720) 5 5 50 50 rgb(0,200,0) 5 rgb(0,100,0) 2 rgb(0,100,0)");
        testScale("G3", "translate(420 660) 5 5 50 50 rgb(0,200,0) 5 rgb(0,100,0) 3 rgb(0,100,0)");
        testScale("G4", "translate(420 600) 5 5 50 50 rgb(0,200,0) 5 rgb(0,100,0) 4 rgb(0,100,0)");
        testScale("G5", "translate(420 540) 5 5 50 50 rgb(0,200,0) 5 rgb(0,100,0) 5 rgb(0,100,0)");
        testScale("G6", "translate(420 480) 5 5 50 50 rgb(0,200,0) 5 rgb(0,100,0) 6 rgb(0,100,0)");

        testScale("Y1", "translate(60 420) 5 5 50 50 rgb(240,204,0) 5 rgb(220,100,0) 1 rgb(220,100,0)");
        testScale("Y2", "translate(120 420) 5 5 50 50 rgb(240,204,0) 5 rgb(220,100,0) 2 rgb(220,100,0)");
        testScale("Y3", "translate(180 420) 5 5 50 50 rgb(240,204,0) 5 rgb(220,100,0) 3 rgb(220,100,0)");
        testScale("Y4", "translate(240 420) 5 5 50 50 rgb(240,204,0) 5 rgb(220,100,0) 4 rgb(220,100,0)");
        testScale("Y5", "translate(300 420) 5 5 50 50 rgb(240,204,0) 5 rgb(220,100,0) 5 rgb(220,100,0)");
        testScale("Y6", "translate(360 420) 5 5 50 50 rgb(240,204,0) 5 rgb(220,100,0) 6 rgb(220,100,0)");

        testScale("B1", "translate(420 60) 5 5 50 50 rgb(0,180,180) 5 rgb(0,80,240) 1 rgb(0,80,240)");
        testScale("B2", "translate(420 120) 5 5 50 50 rgb(0,180,180) 5 rgb(0,80,240) 2 rgb(0,80,240)");
        testScale("B3", "translate(420 180) 5 5 50 50 rgb(0,180,180) 5 rgb(0,80,240) 3 rgb(0,80,240)");
        testScale("B4", "translate(420 240) 5 5 50 50 rgb(0,180,180) 5 rgb(0,80,240) 4 rgb(0,80,240)");
        testScale("B5", "translate(420 300) 5 5 50 50 rgb(0,180,180) 5 rgb(0,80,240) 5 rgb(0,80,240)");
        testScale("B6", "translate(420 360) 5 5 50 50 rgb(0,180,180) 5 rgb(0,80,240) 6 rgb(0,80,240)");

        testScale("R1", "translate(780 420) 5 5 50 50 rgb(240,120,120) 5 rgb(240,0,0) 1 rgb(240,0,0)");
        testScale("R2", "translate(720 420) 5 5 50 50 rgb(240,120,120) 5 rgb(240,0,0) 2 rgb(240,0,0)");
        testScale("R3", "translate(660 420) 5 5 50 50 rgb(240,120,120) 5 rgb(240,0,0) 3 rgb(240,0,0)");
        testScale("R4", "translate(600 420) 5 5 50 50 rgb(240,120,120) 5 rgb(240,0,0) 4 rgb(240,0,0)");
        testScale("R5", "translate(540 420) 5 5 50 50 rgb(240,120,120) 5 rgb(240,0,0) 5 rgb(240,0,0)");
        testScale("R6", "translate(480 420) 5 5 50 50 rgb(240,120,120) 5 rgb(240,0,0) 6 rgb(240,0,0)");

        let testStable = (id, result)=>{
            let stable = retrieve(root, "[Board].[Stable-"+id+"]");
            let frame = retrieve(stable, "[frame]");
            assert.equal(stable.transform+" "+frame.x+" "+frame.y+" "+frame.width+" "+frame.height+" "+frame.fill+" "+frame["stroke-width"]+" "+frame.stroke, result);
        };

        testStable("G", "translate(5 545) 0 0 350 350 rgb(0,200,0) 5 rgb(0,100,0)");
        testStable("Y", "translate(5 5) 0 0 350 350 rgb(240,204,0) 5 rgb(220,100,0)");
        testStable("R", "translate(545 545) 0 0 350 350 rgb(240,120,120) 5 rgb(240,0,0)");
        testStable("B", "translate(545 5) 0 0 350 350 rgb(0,180,180) 5 rgb(0,80,240)");

        let testCenter = (result)=>{
            let center = retrieve(root, "[Board].[Center]");
            let green = retrieve(center, "[G]");
            let yellow = retrieve(center, "[Y]");
            let blue = retrieve(center, "[B]");
            let red = retrieve(center, "[R]");
            assert.equal(center.transform+"["+green.points+" "+green.fill+"]"+"["+yellow.points+" "+yellow.fill+"]"+
                "["+blue.points+" "+blue.fill+"]"+"["+red.points+" "+red.fill+"]", result);
        };

        testCenter("translate(420 420)[ 2,58 30,30 58,58 rgb(0,200,0)][ 2,2 30,30 2,58 rgb(240,204,0)]" +
            "[ 2,2 30,30 58,2 rgb(0,180,180)][ 58,2 30,30 58,58 rgb(240,120,120)]");

        done();
    });

    it("should display one horse in each stable at start", function (done) {
        play(svg,
            {
                speed:20,
                horsesCount:1,
                players:{
                    green:{type:"human"},
                    red:{type:"bot"},
                    blue:{type:"bot"},
                    yellow:{type:"bot"}
                }
            });
        let root = runtime.anchor("content");

        let testHorse = (root, id, result) =>{
            let horse = retrieve(root, "[Horse-"+id+"]");
            let head = retrieve(horse, "[head]");
            let corpse = retrieve(horse, "[corpse]")
            assert.equal(horse.transform+
                " ["+head.points+" "+head.fill+" "+head["stroke-width"]+" "+head.stroke+"]" +
                " ["+corpse.points+" "+corpse.fill+" "+corpse["stroke-width"]+" "+corpse.stroke+"]", result);
        };
        testHorse(root, "green0", "translate(120 660) [ 5,20 30,5 30,35 rgb(0,255,0) 4 rgb(0,100,0)] [ 15,55 30,5 45,55 rgb(0,255,0) 4 rgb(0,100,0)]");
        testHorse(root, "yellow0", "translate(120 120) [ 5,20 30,5 30,35 rgb(255,204,0) 4 rgb(220,100,0)] [ 15,55 30,5 45,55 rgb(255,204,0) 4 rgb(220,100,0)]");
        testHorse(root, "blue0", "translate(660 120) [ 5,20 30,5 30,35 rgb(0,200,200) 4 rgb(0,80,240)] [ 15,55 30,5 45,55 rgb(0,200,200) 4 rgb(0,80,240)]");
        testHorse(root, "red0", "translate(660 660) [ 5,20 30,5 30,35 rgb(255,100,100) 4 rgb(240,0,0)] [ 15,55 30,5 45,55 rgb(255,100,100) 4 rgb(240,0,0)]");
        done();
    });

    it("should display four horses in each stable at start", function (done) {
        play(svg,
            {
                speed:20,
                horsesCount:4,
                players:{
                    green:{type:"human"},
                    red:{type:"bot"},
                    blue:{type:"bot"},
                    yellow:{type:"bot"}
                }
            });
        let root = runtime.anchor("content");

        let testHorse = (root, id, result) =>{
            let horse = retrieve(root, "[Horse-"+id+"]");
            assert.equal(horse.transform, result);
        };
        testHorse(root, "green0", "translate(120 660)");
        testHorse(root, "green1", "translate(180 720)");
        testHorse(root, "green2", "translate(180 660)");
        testHorse(root, "green3", "translate(120 720)");
        testHorse(root, "yellow0", "translate(120 120)");
        testHorse(root, "yellow1", "translate(180 180)");
        testHorse(root, "yellow2", "translate(180 120)");
        testHorse(root, "yellow3", "translate(120 180)");
        testHorse(root, "blue0", "translate(660 120)");
        testHorse(root, "blue1", "translate(720 180)");
        testHorse(root, "blue2", "translate(720 120)");
        testHorse(root, "blue3", "translate(660 180)");
        testHorse(root, "red0", "translate(660 660)");
        testHorse(root, "red1", "translate(720 720)");
        testHorse(root, "red2", "translate(720 660)");
        testHorse(root, "red3", "translate(660 720)");
        done();
    });

    let testHorseInSquare = (component, horseId, squareId) =>{
        let horse = retrieve(component, "[Horse-"+horseId+"]");
        let square = retrieve(component, "[Square-"+squareId+"]");
        assert.equal(horse.transform, "translate("+(square.cx-30)+" "+(square.cy-30)+")");
    };

    let testHorseInStable = (component, horseId, stableId, pos) =>{
        let horse = retrieve(component, "[Horse-"+horseId+"]");
        let stable = retrieve(component, "[Stable-"+stableId+"]");
        let dx = 60;
        let dy = 60;
        assert.equal(horse.handler.x+" "+horse.handler.y, (stable.handler.x+350/2-dx)+" "+(stable.handler.y+350/2-dy));
    };

    let testHorseInWinPosition = (component, horseId, stableId, pos) =>{
        let horse = retrieve(component, "[Horse-"+horseId+"]");
        let stable = retrieve(component, "[Stable-"+stableId+"]");
        let dx = 60*(pos-1);
        assert.equal(horse.handler.x+" "+horse.handler.y, (stable.handler.x-5+dx)+" "+(stable.handler.y-5));
    };

    let testHorseInScale = (component, horseId, scaleId) =>{
        let horse = retrieve(component, "[Horse-"+horseId+"]");
        let scale = retrieve(component, "[Scale-"+scaleId+"]");
        assert.equal(horse.handler.x+" "+horse.handler.y, (scale.handler.x)+" "+(scale.handler.y));
    };

    it("should put a horse on start square, only if a 6 is done", function (done) {
        setDice();
        play(svg,
            {
                speed:20,
                horsesCount:1,
                players:{
                    green:{type:"human"},
                    red:{type:"bot"},
                    blue:{type:"bot"},
                    yellow:{type:"bot"}
                }
            });
        let root = runtime.anchor("content");
        rollDice(1); // Green : no play
        testHorseInStable(root, "green0", "G", 1);
        rollDice(6); // Yellow : play !
        runtime.advanceAll();
        testHorseInSquare(root, "yellow0", "15");
        rollDice(2); // Yellow : replay !
        runtime.advanceAll();
        testHorseInSquare(root, "yellow0", "17");
        rollDice(1); // Blue : no play
        testHorseInStable(root, "blue0", "B", 1);
        rollDice(1); // Red : no play
        testHorseInStable(root, "red0", "R", 1);
        done();
    });

    it("should run all around the board and climb the scales", function (done) {
        setDice();
        play(svg,
            {
                speed:20,
                horsesCount:1,
                players:{
                    green:{type:"bot"},
                    red:{type:"none"},
                    blue:{type:"none"},
                    yellow:{type:"bot"}
                }
            });
        let root = runtime.anchor("content");
        let playOneTurn = (...rolls)=>{
            rollDice(1); // Green : no play
            rolls.forEach(roll=>{
                rollDice(roll);
                runtime.advanceAll();
            });
        };

        playOneTurn(6, 2);
        testHorseInSquare(root, "yellow0", "17");
        playOneTurn(6, 6, 2);
        testHorseInSquare(root, "yellow0", "31");
        playOneTurn(5);
        testHorseInSquare(root, "yellow0", "36");
        playOneTurn(6, 6, 6, 2);
        testHorseInSquare(root, "yellow0", "0");
        playOneTurn(6, 6, 2);
        testHorseInSquare(root, "yellow0", "14");
        playOneTurn(1);
        testHorseInScale(root, "yellow0", "Y1");
        playOneTurn(2);
        testHorseInScale(root, "yellow0", "Y2");
        playOneTurn(3);
        testHorseInScale(root, "yellow0", "Y3");
        playOneTurn(4);
        testHorseInScale(root, "yellow0", "Y4");
        playOneTurn(5);
        testHorseInScale(root, "yellow0", "Y5");
        playOneTurn(6, 1);
        testHorseInScale(root, "yellow0", "Y6");
        playOneTurn(6);
        testHorseInWinPosition(root, "yellow0", "Y", 1);
        done();
    });

    it("should position behind scale, ignoring too big dice result", function (done) {
        setDice();
        play(svg,
            {
                speed:20,
                horsesCount:1,
                players:{
                    green:{type:"bot"},
                    red:{type:"none"},
                    blue:{type:"none"},
                    yellow:{type:"bot"}
                }
            });
        let root = runtime.anchor("content");
        let playOneTurn = (...rolls)=>{
            rollDice(1); // Green : no play
            rolls.forEach(roll=>{
                rollDice(roll);
                runtime.advanceAll();
            });
        };

        playOneTurn(6, 6, 6, 6, 6, 6, 6, 6, 6, 3);
        testHorseInSquare(root, "yellow0", "10");
        playOneTurn(5);
        testHorseInSquare(root, "yellow0", "10");
        playOneTurn(3);
        testHorseInSquare(root, "yellow0", "13");
        playOneTurn(3);
        testHorseInSquare(root, "yellow0", "13");
        playOneTurn(1);
        testHorseInSquare(root, "yellow0", "14");
        done();
    });

    it("should climb scale only when dice value is the next position's", function (done) {
        setDice();
        play(svg,
            {
                speed:20,
                horsesCount:1,
                players:{
                    green:{type:"bot"},
                    red:{type:"none"},
                    blue:{type:"none"},
                    yellow:{type:"bot"}
                }
            });
        let root = runtime.anchor("content");
        let playOneTurn = (...rolls)=>{
            rollDice(1); // Green : no play
            rolls.forEach(roll=>{
                rollDice(roll);
                runtime.advanceAll();
            });
        };

        playOneTurn(6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 1);
        testHorseInSquare(root, "yellow0", "14");
        playOneTurn(2);
        testHorseInSquare(root, "yellow0", "14");
        playOneTurn(1);
        testHorseInScale(root, "yellow0", "Y1");
        playOneTurn(3);
        testHorseInScale(root, "yellow0", "Y1");
        playOneTurn(2);
        testHorseInScale(root, "yellow0", "Y2");
        playOneTurn(6, 3);
        testHorseInScale(root, "yellow0", "Y3");
        playOneTurn(4);
        playOneTurn(5);
        testHorseInScale(root, "yellow0", "Y5");
        playOneTurn(6, 1);
        testHorseInScale(root, "yellow0", "Y6");
        done();
    });

    let clickOnHorse = (root, id)=>{
        let horse = retrieve(root, "[Horse-"+id+"]");
        let head = retrieve(horse, "[head]");
        horse.event("click", {});
        runtime.advanceAll();
    };

    it("should allow a human player to play", function (done) {
        setDice();
        play(svg,
            {
                speed:20,
                horsesCount:1,
                players:{
                    green:{type:"bot"},
                    red:{type:"none"},
                    blue:{type:"none"},
                    yellow:{type:"human"}
                }
            });
        let root = runtime.anchor("content");
        let playOneTurn = (...rolls)=>{
            rollDice(1); // Green : no play
            rolls.forEach(roll=>{
                rollDice(roll);
                runtime.advanceAll();
            });
        };

        playOneTurn(6);
        clickOnHorse(root, "yellow0");
        testHorseInSquare(root, "yellow0", "15");
        rollDice(2);
        clickOnHorse(root, "yellow0");
        testHorseInSquare(root, "yellow0", "17");
        playOneTurn(6);
        clickOnHorse(root, "yellow0");
        testHorseInSquare(root, "yellow0", "23");
        rollDice(6);
        clickOnHorse(root, "yellow0");
        testHorseInSquare(root, "yellow0", "29");
        rollDice(6);
        clickOnHorse(root, "yellow0");
        testHorseInSquare(root, "yellow0", "35");
        rollDice(6);
        clickOnHorse(root, "yellow0");
        testHorseInSquare(root, "yellow0", "41");
        rollDice(6);
        clickOnHorse(root, "yellow0");
        testHorseInSquare(root, "yellow0", "47");
        rollDice(6);
        clickOnHorse(root, "yellow0");
        testHorseInSquare(root, "yellow0", "53");
        rollDice(6);
        clickOnHorse(root, "yellow0");
        testHorseInSquare(root, "yellow0", "3");
        rollDice(6);
        clickOnHorse(root, "yellow0");
        testHorseInSquare(root, "yellow0", "9");
        rollDice(5);
        clickOnHorse(root, "yellow0");
        testHorseInSquare(root, "yellow0", "14");
        playOneTurn(1);
        clickOnHorse(root, "yellow0");
        testHorseInScale(root, "yellow0", "Y1");
        playOneTurn(2);
        clickOnHorse(root, "yellow0");
        testHorseInScale(root, "yellow0", "Y2");
        playOneTurn(3);
        clickOnHorse(root, "yellow0");
        testHorseInScale(root, "yellow0", "Y3");
        playOneTurn(4);
        clickOnHorse(root, "yellow0");
        testHorseInScale(root, "yellow0", "Y4");
        playOneTurn(5);
        clickOnHorse(root, "yellow0");
        testHorseInScale(root, "yellow0", "Y5");
        playOneTurn(6);
        clickOnHorse(root, "yellow0");
        testHorseInScale(root, "yellow0", "Y6");
        rollDice(6);
        clickOnHorse(root, "yellow0");
        testHorseInWinPosition(root, "yellow0", "Y", 1);
        done();
    });

    it("should eject a foe horse when coming on board", function (done) {
        setDice();
        play(svg,
            {
                speed:20,
                horsesCount:1,
                players:{
                    green:{type:"bot"},
                    red:{type:"none"},
                    blue:{type:"none"},
                    yellow:{type:"bot"}
                }
            });
        let root = runtime.anchor("content");

        let playNextHorse = (...rolls)=>{
            rolls.forEach(roll=>{
                rollDice(roll);
                runtime.advanceAll();
            });
        };

        playNextHorse(6, 6, 6, 2);
        testHorseInStable(root, "yellow0", "Y", 1);
        testHorseInSquare(root, "green0", "15");
        playNextHorse(6, 2);
        testHorseInSquare(root, "yellow0", "17");
        testHorseInStable(root, "green0", "G", 1);
        done();
    });

    it("should eject a foe horse when moving", function (done) {
        setDice();
        play(svg,
            {
                speed:20,
                horsesCount:1,
                players:{
                    green:{type:"bot"},
                    red:{type:"none"},
                    blue:{type:"none"},
                    yellow:{type:"bot"}
                }
            });
        let root = runtime.anchor("content");

        let playNextHorse = (...rolls)=>{
            rolls.forEach(roll=>{
                rollDice(roll);
                runtime.advanceAll();
            });
        };

        playNextHorse(6, 6, 6, 5);
        testHorseInSquare(root, "green0", "18");
        testHorseInStable(root, "yellow0", "Y", 1);
        playNextHorse(6, 2);
        testHorseInSquare(root, "green0", "18");
        testHorseInSquare(root, "yellow0", "17");
        playNextHorse(3);
        testHorseInSquare(root, "green0", "21");
        testHorseInSquare(root, "yellow0", "17");
        playNextHorse(4);
        testHorseInStable(root, "green0", "G", 1);
        testHorseInSquare(root, "yellow0", "21");
        done();
    });

    it("exits the game and resume", function (done) {
        setDice();
        play(svg,
            {
                speed:20,
                horsesCount:1,
                players:{
                    green:{type:"bot"},
                    red:{type:"none"},
                    blue:{type:"none"},
                    yellow:{type:"bot"}
                }
            });
        let root = runtime.anchor("content");

        let playNextHorse = (...rolls)=>{
            rolls.forEach(roll=>{
                rollDice(roll);
                runtime.advanceAll();
            });
        };
        let game = retrieve(root, "[Game]");
        assert.ok(game);
        playNextHorse(6, 5);
        testHorseInSquare(root, "green0", "6"); // Just to begin play
        retrieve(root, "[Exit]").event("click", {});
        for(var i=0; i<11; i++) {
            runtime.setRandom(0.5);
        }
        runtime.advanceAll();
        testHorseInStable(game, "yellow0", "Y", 1); // Smooth stop
        game = retrieve(root, "[Board]");
        assert.ok(!game);
        let menu = retrieve(root, "[Menu]");
        assert.ok(menu);
        retrieve(menu, "[ResumeOption]").event("click", {});
        menu = retrieve(root, "[Menu]");
        assert.ok(!menu);
        game = retrieve(root, "[Board]");
        assert.ok(game);
        testHorseInSquare(root, "green0", "6"); // Same state
        done();
    });

    it("exits the game and asks for a new one", function (done) {
        setDice();
        play(svg,
            {
                speed:20,
                horsesCount:1,
                players:{
                    green:{type:"bot"},
                    red:{type:"none"},
                    blue:{type:"none"},
                    yellow:{type:"bot"}
                }
            });
        let root = runtime.anchor("content");

        let playNextHorse = (...rolls)=>{
            rolls.forEach(roll=>{
                rollDice(roll);
                runtime.advanceAll();
            });
        };
        let game = retrieve(root, "[Game]");
        assert.ok(game);
        playNextHorse(6, 5);
        testHorseInSquare(root, "green0", "6"); // Just to begin play
        retrieve(root, "[Exit]").event("click", {});
        game = retrieve(root, "[Game]");
        let menu = retrieve(root, "[Menu]");
        retrieve(menu, "[NewGameOption]").event("click", {});
        menu = retrieve(root, "[Menu]");
        assert.ok(!menu);
        game = retrieve(root, "[Game]");
        assert.ok(game);
        testHorseInStable(root, "green0", "G", 1); // Start status
        done();
    });
});

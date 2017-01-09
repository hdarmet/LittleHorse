/**
 * Created by HDA3014 on 11/03/2016.
 */
var assert = require('assert');
var testUtils = require('./testutils');
var mockRuntime = require('../runtimemock').mockRuntime;
require('../enhancer').Enhance();
var SVG = require('../svghandler').SVG;
var GameItems = require('../gameitems').GameItems;

var runtime;
var svg;
var gitems;
var inspect = testUtils.inspect;
var retrieve = testUtils.retrieve;

describe('Game items', function() {

    describe('Miscelleneous', function () {

        beforeEach(function () {
            runtime = mockRuntime();
            runtime.declareAnchor('content');
            svg = SVG(runtime);
            gitems = GameItems(svg);
        });

        it("checks Command behavior", function() {
            let rExit=false;
            let exit = new gitems.Exit(
                ()=>rExit=true
            );
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(exit.component);
            inspect(drawing.component, {tag:"svg",
                children:[
                    {"tag":"g", "transform":"translate(0 0)",
                        children:[
                            {"tag":"polygon","points":"40,0 40,60 0,30","fill":"rgb(100,100,255)","stroke-width":4,"stroke":"rgb(80,80,120)"},
                            {"tag":"polygon","points":"60,0 60,60 20,30","fill":"rgb(100,100,255)","stroke-width":4,"stroke":"rgb(80,80,120)"}
                        ]
                    }
                ]});
            exit.component.component.event("click", {});
            assert.ok(rExit);
            exit.desactivate();
            inspect(drawing.component, {tag:"svg",
                children:[
                    {"tag":"g", "transform":"translate(0 0)",
                        children:[
                            {"tag":"polygon","points":"40,0 40,60 0,30","fill":"rgb(200,200,200)","stroke-width":4,"stroke":"rgb(128,128,128)"},
                            {"tag":"polygon","points":"60,0 60,60 20,30","fill":"rgb(200,200,200)","stroke-width":4,"stroke":"rgb(128,128,128)"}
                        ]
                    }
                ]});
            rExit=false;
            exit.component.component.event("click", {});
            assert.ok(!rExit);
            exit.activate();
            inspect(drawing.component, {tag:"svg",
                children:[
                    {"tag":"g", "transform":"translate(0 0)",
                        children:[
                            {"tag":"polygon","points":"40,0 40,60 0,30","fill":"rgb(100,100,255)","stroke-width":4,"stroke":"rgb(80,80,120)"},
                            {"tag":"polygon","points":"60,0 60,60 20,30","fill":"rgb(100,100,255)","stroke-width":4,"stroke":"rgb(80,80,120)"}
                        ]
                    }
                ]});
            exit.component.component.event("click", {});
            assert.ok(rExit);
        });

        it("checks Push appearance", function() {
            let push = new gitems.Push();
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(push.component);
            inspect(drawing.component, {tag:"svg",
                children:[
                    {"tag":"g", "transform":"translate(0 0)",
                        children:[
                            {"tag":"polygon","points":"0,0 0,60 40,30","fill":"rgb(100,100,255)","stroke-width":4,"stroke":"rgb(80,80,120)"},
                            {"tag":"polygon","points":"20,0 20,60 60,30","fill":"rgb(100,100,255)","stroke-width":4,"stroke":"rgb(80,80,120)"}
                        ]
                    }
                ]});
        });

        it("checks Next appearance", function() {
            let next = new gitems.Next();
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(next.component);
            inspect(drawing.component, {tag:"svg",
                children:[
                    {"tag":"g", "transform":"translate(0 0)",
                        children:[
                            {"tag":"polygon","points":"0,0 0,70 50,35","fill":"rgb(120,200,120)","stroke-width":4,"stroke":"rgb(0,100,0)"},
                        ]
                    }
                ]});
        });

        it("checks Prev appearance", function() {
            let prev = new gitems.Prev();
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(prev.component);
            inspect(drawing.component, {tag:"svg",
                children:[
                    {"tag":"g", "transform":"translate(0 0)",
                        children:[
                            {"tag":"polygon","points":"50,0 50,70 0,35","fill":"rgb(120,200,120)","stroke-width":4,"stroke":"rgb(0,100,0)"},
                        ]
                    }
                ]});
        });

        it("checks Smiley behavior", function() {
            let rAction = false;
            let smiley = new gitems.Smiley(()=>rAction=true, ":|");
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(smiley.component);
            inspect(drawing.component, {tag:"svg",
                children:[
                    {"tag":"g", "transform":"translate(0 0)",
                        children:[
                            {"tag":"circle","cx":30,"cy":30,"r":35,"fill":"rgb(255,204,0)","stroke-width":4,"stroke":"rgb(220,100,0)"},
                            {"tag":"circle","cx":15,"cy":20,"r":5,"fill":"rgb(255,204,0)","stroke-width":4,"stroke":"rgb(220,100,0)"},
                            {"tag":"circle","cx":45,"cy":20,"r":5,"fill":"rgb(255,204,0)","stroke-width":4,"stroke":"rgb(220,100,0)"},
                            {"tag":"line","x1":15,"y1":45, "x2":45,"y2":45, "fill":"none","stroke-width":4,"stroke":"rgb(220,100,0)"},
                        ]
                    }
                ]});
            smiley.component.component.event("click", {});
            assert.ok(rAction);
            smiley.setType(":)");
            inspect(drawing.component, {tag:"svg",
                children:[
                    {"tag":"g", children:[
                        {}, {}, {},
                        {"tag":"path","d":"M 15,40 Q 30,60 45,40 ", "fill":"none","stroke-width":4,"stroke":"rgb(220,100,0)"},
                    ]}
                ]});
            smiley.setType(":(");
            inspect(drawing.component, {tag:"svg",
                children:[
                    {"tag":"g", children:[
                        {}, {}, {},
                        {"tag":"path","d":"M 15,50 Q 30,30 45,50 ", "fill":"none","stroke-width":4,"stroke":"rgb(220,100,0)"},
                    ]}
                ]});
        });

        it("checks Die behavior", function() {
            let inspectValue = value=>{
                switch(value) {
                    case 1:
                        inspect(drawing.component, {tag:"svg",
                            children:[
                                {"tag":"g", "transform":"translate(0 0)",
                                    children:[
                                        {"tag":"rect","x":0,"y":0,"width":60, "height":60, "fill":"rgb(255,255,255)","stroke-width":3,"stroke":"rgb(50,50,50)"},
                                        {"tag":"g","transform":"translate(0 0)",
                                            children: [
                                                {"tag":"circle","cx":30,"cy":30,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                            ]
                                        }
                                    ]
                                }
                            ]});
                        break;
                    case 2:
                        inspect(drawing.component, {tag:"svg", children:[
                            {"tag":"g", children:[{"tag":"rect"},{"tag":"g",
                                children: [
                                    {"tag":"circle","cx":15,"cy":15,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":45,"cy":45,"r":6,"fill":"rgb(50,50,50)","stroke-width":0}
                                ]}]}
                        ]});
                        break;
                    case 3:
                        inspect(drawing.component, {tag:"svg", children:[
                            {"tag":"g", children:[{"tag":"rect"},{"tag":"g",
                                children: [
                                    {"tag":"circle","cx":15,"cy":15,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":30,"cy":30,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":45,"cy":45,"r":6,"fill":"rgb(50,50,50)","stroke-width":0}
                                ]}]}
                        ]});
                        break;
                    case 4:
                        inspect(drawing.component, {tag:"svg", children:[
                            {"tag":"g", children:[{"tag":"rect"},{"tag":"g",
                                children: [
                                    {"tag":"circle","cx":15,"cy":15,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":15,"cy":45,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":45,"cy":15,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":45,"cy":45,"r":6,"fill":"rgb(50,50,50)","stroke-width":0}
                                ]}]}
                        ]});
                        break;
                    case 5:
                        inspect(drawing.component, {tag:"svg", children:[
                            {"tag":"g", children:[{"tag":"rect"},{"tag":"g",
                                children: [
                                    {"tag":"circle","cx":15,"cy":15,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":15,"cy":45,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":45,"cy":15,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":45,"cy":45,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":30,"cy":30,"r":6,"fill":"rgb(50,50,50)","stroke-width":0}
                                ]}]}
                        ]});
                        break;
                    case 6:
                        inspect(drawing.component, {tag:"svg", children:[
                            {"tag":"g", children:[{"tag":"rect"},{"tag":"g",
                                children: [
                                    {"tag":"circle","cx":15,"cy":15,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":15,"cy":45,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":15,"cy":30,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":45,"cy":15,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":45,"cy":45,"r":6,"fill":"rgb(50,50,50)","stroke-width":0},
                                    {"tag":"circle","cx":45,"cy":30,"r":6,"fill":"rgb(50,50,50)","stroke-width":0}
                                ]}]}
                        ]});
                        break;
                }
            };
            let die = new gitems.Die({speed:10});
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(die.component);
            inspectValue(1);
            die.setValue(2);
            inspectValue(2);
            die.setValue(3);
            inspectValue(3);
            die.setValue(4);
            inspectValue(4);
            die.setValue(5);
            inspectValue(5);
            die.setValue(6);
            inspectValue(6);
            runtime.setRandom(3.0/6.0-0.05);
            die.randomValue();
            inspectValue(3);
            runtime.setRandom(1.0/6.0-0.05);
            runtime.setRandom(2.0/6.0-0.05);
            runtime.setRandom(3.0/6.0-0.05);
            runtime.setRandom(4.0/6.0-0.05);
            runtime.setRandom(5.0/6.0-0.05);
            runtime.setRandom(6.0/6.0-0.05);
            runtime.setRandom(1.0/6.0-0.05);
            runtime.setRandom(2.0/6.0-0.05);
            runtime.setRandom(3.0/6.0-0.05);
            runtime.setRandom(4.0/6.0-0.05);
            runtime.setRandom(5.0/6.0-0.05);
            die.roll();
            runtime.advanceAll();
            inspectValue(5);
        });

        let testLed = (led, value)=>{
            let lights = [
                [0, 1, 2, 4, 5, 6],
                [2, 4],
                [1, 2, 3, 5, 6],
                [1, 2, 3, 4, 5],
                [0, 2, 3, 4],
                [0, 1, 3, 4, 5],
                [0, 1, 3, 4, 5, 6],
                [1, 2, 4],
                [0, 1, 2, 3, 4, 5, 6],
                [0, 1, 2, 3, 4, 5]
            ];
            for(let light=0; light<7; light++) {
                if (value>=0 && lights[value].contains(light)) {
                    assert.equal(led.component.component.children[light].stroke, "rgb(250,0,0)");
                }
                else {
                    assert.equal(led.component.component.children[light].stroke, "rgb(0,0,0)");
                }
            }
        };

        let testDisplay=(timeDisplay, h1, h2, m1, m2, s1, s2)=> {
            testLed(timeDisplay.hoursDisplay.leds[0], h1);
            testLed(timeDisplay.hoursDisplay.leds[1], h2);
            testLed(timeDisplay.minutesDisplay.leds[0], m1);
            testLed(timeDisplay.minutesDisplay.leds[1], m2);
            testLed(timeDisplay.secondsDisplay.leds[0], s1);
            testLed(timeDisplay.secondsDisplay.leds[1], s2);
        }

        it("checks LED behavior", function() {
            let led = new gitems.Led(20, 40, svg.BLACK, svg.RED);
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(led.component);
            inspect(drawing.component, {tag:"svg",
                children:[
                    {"tag":"g", "transform":"translate(0 0)",
                        children:[
                            {"tag":"line","x1":-20, "y1":0, "x2":-20, "y2":-40,"stroke-width":3,"stroke":"rgb(0,0,0)"},
                            {"tag":"line","x1":-20, "y1":-40, "x2":20, "y2":-40,"stroke-width":3,"stroke":"rgb(0,0,0)"},
                            {"tag":"line","x1":20, "y1":-40, "x2":20, "y2":0,"stroke-width":3,"stroke":"rgb(0,0,0)"},
                            {"tag":"line","x1":-20, "y1":0, "x2":20, "y2":0,"stroke-width":3,"stroke":"rgb(0,0,0)"},
                            {"tag":"line","x1":20, "y1":40, "x2":20, "y2":0,"stroke-width":3,"stroke":"rgb(0,0,0)"},
                            {"tag":"line","x1":-20, "y1":40, "x2":20, "y2":40,"stroke-width":3,"stroke":"rgb(0,0,0)"},
                            {"tag":"line","x1":-20, "y1":0, "x2":-20, "y2":40,"stroke-width":3,"stroke":"rgb(0,0,0)"},
                        ]
                    }
                ]});
            for (let value=0; value<=9; value++) {
                led.show(value);
                testLed(led, value);
            }
            led.reset();
            testLed(led, -1);
        });

        it("checks LED counter behavior", function() {
            let ledCounter = new gitems.LedCounter(3, 20, 40, 5, svg.BLACK, svg.RED);
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(ledCounter.component);
            inspect(drawing.component, {tag:"svg",
                children:[
                    {"tag":"g", "transform":"translate(0 0)",
                        children:[
                            {"tag":"g", "transform":"translate(0 0)",
                                children:[
                                    {"tag":"line","x1":-20, "y1":0, "x2":-20, "y2":-40,"stroke-width":3,"stroke":"rgb(0,0,0)"},
                                ]
                            },
                            {"tag":"g", "transform":"translate(45 0)",
                                children:[
                                    {"tag":"line","x1":-20, "y1":0, "x2":-20, "y2":-40,"stroke-width":3,"stroke":"rgb(0,0,0)"},
                                ]
                            },
                            {"tag":"g", "transform":"translate(90 0)",
                                children:[
                                    {"tag":"line","x1":-20, "y1":0, "x2":-20, "y2":-40,"stroke-width":3,"stroke":"rgb(0,0,0)"},
                                ]
                            }
                        ]}
                ]});
            ledCounter.show(13, true);
            testLed(ledCounter.leds[0], 0);
            testLed(ledCounter.leds[1], 1);
            testLed(ledCounter.leds[2], 3);
            ledCounter.show(13, false);
            testLed(ledCounter.leds[0], -1);
            testLed(ledCounter.leds[1], 1);
            testLed(ledCounter.leds[2], 3);
        });

        it("checks Time Display behavior", function() {
            let timeDisplay = new gitems.TimeDisplay(20, 40, 5, svg.BLACK, svg.RED);
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(timeDisplay.component);
            inspect(drawing.component, {tag:"svg",
                children:[
                    {"tag":"g", "transform":"translate(0 0)",
                        children:[
                            {"tag":"g", "transform":"translate(0 0)",
                                children:[
                                    {"tag":"g", "transform":"translate(0 0)"},
                                    {"tag":"g", "transform":"translate(45 0)"}
                                ]},
                            {"tag":"g", "transform":"translate(95 0)",
                                children:[
                                    {"tag":"g", "transform":"translate(0 0)"},
                                    {"tag":"g", "transform":"translate(45 0)"}
                                ]},
                            {"tag":"g", "transform":"translate(190 0)",
                                children:[
                                    {"tag":"g", "transform":"translate(0 0)"},
                                    {"tag":"g", "transform":"translate(45 0)"}
                                ]}
                        ]}
                ]});
            timeDisplay.show(1*3600+23*60+45);
            testDisplay(timeDisplay, -1, 1, 2, 3, 4, 5);
            timeDisplay.show(4*60+56);
            testDisplay(timeDisplay, -1, -1, -1, 4, 5, 6);
        });

        it("checks Time Keeper behavior", function() {
            let timeKeeper = new gitems.TimeKeeper(20, 40, 5, svg.BLACK, svg.RED);
            var drawing = new svg.Drawing(1000, 500);
            drawing.add(timeKeeper.component);
            testDisplay(timeKeeper.display, -1, -1, -1, -1, -1, -1);
            timeKeeper.start();
            runtime.advance();
            testDisplay(timeKeeper.display, -1, -1, -1, -1, -1, 1);
            runtime.advance();
            testDisplay(timeKeeper.display, -1, -1, -1, -1, -1, 2);
            timeKeeper.stop();
            runtime.advance();
            testDisplay(timeKeeper.display, -1, -1, -1, -1, -1, 2);
        });

        it("checks Menu behavior", function() {
            let menu = new gitems.Menu("My Menu", {});
            menu.show();
            inspect(menu.canvas.component, {
                "tag":"svg","xlink":"http://www.w3.org/1999/xlink","width":1200,"height":1000,
                    children:[
                        {"id":"Title","tag":"g","transform":"translate(500 150)",
                            children:[
                                {"tag":"rect","x":-350,"y":-60,"width":700,"height":120,"fill":"rgb(200,100,100)","stroke-width":5,"stroke":"rgb(255,50,50)"},
                                {"tag":"text","x":0,"y":20,"text-anchor":"middle","font-family":"Arial","font-size":80,"text-decoration":"none","text":"My&nbsp;Menu","fill":"rgb(255,50,50)","stroke-width":0,"stroke":"none"}
                            ]
                        },
                        {"id":"ResumeOption","tag":"g","transform":"translate(320 270)"},
                        {"id":"NewGameOption","tag":"g","transform":"translate(680 270)"},
                        {"tag":"g","transform":"translate(500 580)"}
                    ]
            });
            let rResume = false;
            let game = {resume(){rResume=true;}};
            let newGame = {resume(){rResume=true;}};
            menu.setGame(game, ()=>{
                menu.game = newGame;
            });
            let resumeOption = retrieve(menu.canvas.component, "[ResumeOption]");
            assert.ok(resumeOption);
            runtime.event(resumeOption, "click", {});
            assert.ok(!runtime.anchor("content").children.contains(menu.canvas.component));
            assert.ok(rResume);
            menu.show();
            let newGameOption = retrieve(menu.canvas.component, "[NewGameOption]");
            assert.ok(newGameOption);
            runtime.event(newGameOption, "click", {});
            assert.ok(!runtime.anchor("content").children.contains(menu.canvas.component));
            assert.equal(newGame, menu.game);
        });

        it("checks behavior of options list in menu", function() {
            let menu = new gitems.Menu("My Menu", {});
            menu.optionsList("Speed", [
                {value:10, text:"10"},
                {value:20, text:"20"}
            ],55,"speed", 520, 350);
            menu.show();
            let speed = retrieve(menu.canvas.component, "[speed]");
            inspect(speed, {id:"speed", tag:"g",
                children:[
                    {"id":"10","tag":"rect","x":-57.5,"y":75,"width":55,"height":50,"fill":"rgb(150,150,250)","stroke-width":3,"stroke":"rgb(255,50,50)","opacity":0},
                    {"tag":"text","listeners":{},"isElement":true,"x":-30,"y":110,"text-anchor":"middle","font-family":"Arial","font-size":30,"text-decoration":"none","text":"10","fill":"rgb(50,50,255)","stroke-width":0,"stroke":"none"},
                    {"id":"20","tag":"rect","x":2.5,"y":75,"width":55,"height":50,"fill":"rgb(150,150,250)","stroke-width":3,"stroke":"rgb(255,50,50)","opacity":0},
                    {"tag":"text","x":30,"y":110,"text-anchor":"middle","font-family":"Arial","font-size":30,"text-decoration":"none","text":"20","fill":"rgb(50,50,255)","stroke-width":0,"stroke":"none"},
                    {"tag":"text","x":0,"y":150,"text-anchor":"middle","font-family":"Arial","font-size":25,"text-decoration":"none","text":"Speed","fill":"rgb(50,50,255)","stroke-width":0,"stroke":"none"}
                ]
            });
            let speed20 = retrieve(speed, "[20]");
            runtime.event(speed20, "click", {});
            inspect(speed, {id:"speed", tag:"g",
                children:[
                    {"id":"10","opacity":0},
                    {},
                    {"id":"20","opacity":1},
                    {},
                    {}
                ]
            });
            assert.equal(menu.param["speed"], "20");
        });

        it("checks behavior of live count in menu", function() {
            let menu = new gitems.Menu("My Menu", {lives:2});
            menu.setLiveCount("Lives count", "lives", 700, 350,
                function(i) {
                    return new svg.Translation(i*10, 0).add(new svg.Rect(10, 10));
                }, 4,
                [svg.GREEN, 4, svg.LIGHT_GREEN]);
            menu.show();
            let lives = retrieve(menu.canvas.component, "[lives]");
            inspect(lives, {id:"lives", tag:"g",
                children:[
                    {"tag":"g","transform":"translate(-60 70)",
                        children:[
                            {tag:"g", "transform":"translate(0 0)",
                                children:[
                                    {tag:"rect", width:10, height:10, fill:"rgb(0,200,0)"}
                                ]
                            },
                            {tag:"g", "transform":"translate(10 0)",
                                children:[
                                    {tag:"rect", width:10, height:10, fill:"rgb(0,200,0)"}
                                ]
                            },
                            {tag:"g", "transform":"translate(20 0)",
                                children:[
                                    {tag:"rect", width:10, height:10, fill:"rgb(150,150,150)"}
                                ]
                            },
                            {tag:"g", "transform":"translate(30 0)",
                                children:[
                                    {tag:"rect", width:10, height:10, fill:"rgb(150,150,150)"}
                                ]
                            }
                        ]
                    }
                ]
            });
            let live1 = retrieve(menu.canvas.component, "[live1]");
            assert.ok(live1);
            runtime.event(live1, "click", {});
            assert.equal(menu.param["lives"], 3);
            runtime.event(live1, "click", {});
            assert.equal(menu.param["lives"], 4);
            runtime.event(live1, "click", {});
            assert.equal(menu.param["lives"], 1);
        });

        it("checks behavior of live count in menu", function() {
            let menu = new gitems.Menu("My Menu", {
                players:{
                    green:{type:"human"},
                    red:{type:"bot"},
                    blue:{type:"none"},
                    yellow:{type:"none"}
                }
            });
            menu.setPlayers("Players", "players", "type", 500, 650);
            menu.show();
            let players = retrieve(menu.canvas.component, "[players]");
            assert.ok(players);
            inspect(players, {id:"players", tag: "g", transform:"translate(500 650)",
                children:[
                    {tag:"g", transform:"translate(-100 50)",
                        children:[
                            {tag:"g",
                                children:[
                                    {tag:"path", d:"M -25,50 L -25,17 C -25,-16 25,-16 25,17 L 25,50 -25,50", fill:"rgb(0,255,0)", "stroke-width":4, stroke:"rgb(0,100,0)"},
                                    {tag:"circle", cx:0, cy:-20, r:20, fill:"rgb(0,255,0)", "stroke-width":4, stroke:"rgb(0,100,0)"}
                                ]
                            }
                        ]
                    },
                    {tag:"g", transform:"translate(-100 -50)",
                        children:[
                            {tag:"g",
                                children:[
                                    {tag:"path", d:"M -30,50 L -30,0 C -30,-50 30,-50 30,0 L 30,50 -30,50", fill:"rgb(255,204,0)", "stroke-width":4, stroke:"rgb(220,100,0)"},
                                    {tag:"ellipse", cx:-12, cy:0, rx:8, ry:12, fill:"rgb(255,204,0)", "stroke-width":4, stroke:"rgb(220,100,0)"},
                                    {tag:"ellipse", cx:12, cy:0, rx:8, ry:12, fill:"rgb(255,204,0)", "stroke-width":4, stroke:"rgb(220,100,0)"}
                                ]
                            }
                        ]},
                    {tag:"g", transform:"translate(100 50)",
                        children:[
                            {tag:"g",
                                children:[
                                    {tag:"rect", x:-30, y:0, width:60, height:50, fill:"rgb(255,100,100)", "stroke-width":4, stroke:"rgb(240,0,0)"},
                                    {tag:"rect", x:-40, y:40, width:80, height:10, fill:"rgb(255,100,100)", "stroke-width":4, stroke:"rgb(240,0,0)"},
                                    {tag:"rect", x:-25, y:-40, width:50, height:40, fill:"rgb(255,100,100)", "stroke-width":4, stroke:"rgb(240,0,0)"},
                                    {tag:"rect", x:-20, y:-35, width:40, height:30, fill:"rgb(255,100,100)", "stroke-width":4, stroke:"rgb(240,0,0)"}
                                ]
                            }
                        ]},
                    {tag:"g", transform:"translate(100 -50)"}
                ]
            });
            let green = retrieve(players, "[green]");
            assert.ok(green);
            runtime.event(green.children[0], "click", {});
            assert.equal(menu.param.players.green.type, "bot");
        });

    });

});
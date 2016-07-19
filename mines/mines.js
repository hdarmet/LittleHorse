/**
 * Created by HDA3014 on 16/01/2016.
 */
let GameItems = require("../gameitems.js").GameItems;

console.log("Mines loaded...");

exports.playMines = function(svg, param) {

    var gameItems = new GameItems(svg);

    class Square {

        constructor(game, x, y) {
            this.x = x;
            this.y = y;
            this.game = game;
            this.cover = new svg.Translation()
                .add(new svg.Rect(40, 40).color([180, 180, 180], 4, [50, 50, 50])/*.clickable()*/);
            this.flag = new svg.Translation()
                .add(new svg.Triangle(16, 12, "E").position(3, -4).color([255, 0, 0], 3, [200, 50, 50]))
                .add(new svg.Line(-7, -12, -7, 12).color([], 3, [10, 10, 10]));
            this.hidden = null;
            this.discovered = false;
            this.flagged = false;
            this.component = new svg.Translation(x * 40 + 50, y * 40 + 50);
            this.component.add(this.cover);

            var clickFunction = ()=> {
                if (!this.hidden) {
                    game.board.init(this, game.minesCount);
                    game.time.start();
                }
                this.discover();
                if (this.type === "M") {
                    game.loose();
                }
            };
            this.component.onClick(clickFunction);
            this.flag.onClick(clickFunction);

            var rightClickFunction = ()=> {
                if (!this.flagged) {
                    this.flagged = true;
                    this.component.add(this.flag);
                    //this.flag.clickable(true);
                }
                else {
                    this.flagged = false;
                    this.component.remove(this.flag);
                    //this.flag.clickable(false);
                }
            };
            this.component.onRightClick(rightClickFunction);
            this.flag.onRightClick(rightClickFunction);
        }

        discover() {
            if (!this.discovered) {
                this.component.remove(this.cover);
                this.component.add(this.hidden);
                this.discovered = true;
                game.checkSuccess();
                if (this.type === "0") {
                    game.discoverAround(this.x, this.y);
                }
            }
        }

        show() {
            if (!this.discovered) {
                this.component.remove(this.cover);
                this.component.add(this.hidden);
            }
        }

        initHidden(type) {
            var colors = {
                "1": [0, 192, 0],
                "2": [0, 128, 64],
                "3": [0, 64, 128],
                "4": [0, 0, 192],
                "5": [48, 0, 144],
                "6": [96, 0, 96],
                "7": [144, 0, 48],
                "8": [192, 0, 0]
            };
            this.type = type;
            if (type === "0") {
                this.hidden = new svg.Rect(40, 40).color([230, 230, 230], 4, [100, 100, 100]);
            }
            else if (type >= "1" && type <= "8") {
                this.hidden = new svg.Translation()
                    .add(new svg.Rect(40, 40).color([230, 230, 230], 4, [100, 100, 100]))
                    .add(new svg.Text(type).position(0, 7).font("Verdana", 24).color(colors[type]));
            }
            else if (type === "M") {
                this.hidden = new svg.Translation()
                    .add(new svg.Rect(40, 40).color([200, 50, 50], 4, [100, 100, 100]))
                    .add(new svg.Line(0, -14, 0, 14).color([], 4, [10, 10, 10]))
                    .add(new svg.Line(-14, 0, 14, 0).color([], 4, [10, 10, 10]))
                    .add(new svg.Line(-10, -10, 10, 10).color([], 4, [10, 10, 10]))
                    .add(new svg.Line(-10, 10, 10, -10).color([], 4, [10, 10, 10]))
                    .add(new svg.Circle(10).color([10, 10, 10]))
                    .add(new svg.Rotation(-45).add(new svg.Ellipse(3, 2).position(0, -5).color([255, 255, 255])));
            }

        }

        desactivate() {
            if (this.type === "M") {
                this.component.onClick(null);
                if (!this.flagged) {
                    this.component.add(this.flag);
                    this.flag.clickable(false);
                }
            }
        }
    }

    class Board {

        constructor(game, size) {
            this.game = game;
            this.component = new svg.Translation();

            this.rows = [];
            for (var i = 0; i < size; i++) {
                var row = [];
                for (var j = 0; j < size; j++) {
                    var square = new Square(game, j, i);
                    this.component.add(square.component);
                    row.push(square);
                }
                this.rows.push(row);
            }
        }

        square(c, r) {
            return this.rows[r][c];
        }

        init(first, minesCount) {
            let test=(c, r)=> {
                if (c < 0 || c >= param.size || r < 0 || r >= param.size) {
                    return false;
                }
                return this.square(c, r).mine;
            };
            for (var m = 0; m < minesCount; m++) {
                var found = false;
                while (!found) {
                    var r = Math.floor(svg.random() * param.size);
                    var c = Math.floor(svg.random() * param.size);
                    if (!this.square(c, r).mine && this.square(c, r) !== first) {
                        this.square(c, r).mine = true;
                        found = true;
                    }
                }
            }
            for (var x = 0; x < param.size; x++) {
                for (var y = 0; y < param.size; y++) {
                    if (this.square(x, y).mine) {
                        this.square(x, y).initHidden("M");
                    }
                    else {
                        var count = 0;
                        for (var i = -1; i < 2; i++) {
                            for (var j = -1; j < 2; j++) {
                                if (test(x + i, y + j)) {
                                    count++;
                                }
                            }
                        }
                        this.square(x, y).initHidden("" + count);
                    }
                }
            }
        }

    }

    class Game {

        constructor(exit) {
            this.minesCount = Math.round(param.size * param.size * param.minePercent / 100);
            this.canvas = new svg.Drawing(1200, 1000).show("content");
            this.add(new gameItems.Exit(exit).component.move(30, 30));
            this.smiley = new gameItems.Smiley(()=>this.again(), ":|");
            this.add(this.smiley.component.move(30, 120));
            this.time = new gameItems.TimeKeeper(5, 12, 6, [220, 220, 220], [0, 0, 0]);
            this.add(this.time.component.move(15, 230));
            this.board = new Board(this, param.size);
            this.add(this.board.component.move(100, 0));
            this.discoverCount = 0;
        }

        checkSuccess() {
            this.discoverCount++;
            if ((param.size * param.size - this.discoverCount) === this.minesCount) {
                this.smiley.setType(":)");
                this.time.stop();
                for (var c = 0; c < param.size; c++) {
                    for (var r = 0; r < param.size; r++) {
                        if (this.board.square(c, r).mine) {
                            this.board.square(c, r).desactivate();
                        }
                    }
                }
            }
        }

        discoverAround(c, r) {
            for (var i = -1; i < 2; i++) {
                for (var j = -1; j < 2; j++) {
                    if (c + i >= 0 && c + i < param.size && r + j >= 0 && r + j < param.size) {
                        this.board.square(c + i, r + j).discover();
                    }
                }
            }
        }

        loose() {
            for (var c = 0; c < param.size; c++) {
                for (var r = 0; r < param.size; r++) {
                    this.board.square(c, r).show();
                }
            }
            this.smiley.setType(":(");
            this.time.stop();
        }

        destroy() {
            this.stop = true;
            this.canvas.hide();
        }

        resume() {
            delete this.stop;
            this.canvas.show("content");
            if (this.mustPlay) {
                delete this.mustPlay;
                this.nextPlay();
            }
        }

        add(component) {
            this.canvas.add(component);
        }

        remove(component) {
            this.canvas.remove(component);
        }

        again() {
            this.remove(this.board.component);
            this.board = new Board(this, param.size);
            this.add(this.board.component.move(100, 0));
            this.smiley.setType(":|");
            this.time.reset();
            this.discoverCount = 0;
        }

    }

    var game;
    var menu = new gameItems.Menu("Mines", param);
    menu.optionsList("Sizes", [
        {value:5, text:"5x5"},
        {value:10, text:"10x10"},
        {value:15, text:"15x15"},
        {value:20, text:"20x20"},
        {value:25, text:"25x25"}
    ],100,"size", 700, 350);
    menu.optionsList("Difficulty", [
        {value:5, text:"Easy"},
        {value:10, text:"Fair"},
        {value:15, text:"Normal"},
        {value:20, text:"Hard"},
        {value:25, text:"Nightmare"}
    ],130,"minePercent", 770, 550);

    function createGame() {
        game = new Game(function () {
            game.destroy();
            menu.show();
        });
        menu.setGame(game, createGame);
    }

    createGame();
};

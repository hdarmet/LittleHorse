/**
 * Created by HDA3014 on 16/01/2016.
 */
let GameItems = require("../gameitems.js").GameItems;

console.log("Horses loaded...");

exports.playAzar = function(svg, param) {

    const gameItems = new GameItems(svg);
    const numbers = ["VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];

    class Game {

        constructor(exit) {
            this.canvas = new svg.Drawing(1200, 1000).show("content");
            this.add(new gameItems.Exit(exit).component.move(30, 30));
            this.board = new Board();
            this.add(this.board.component.move(100, 0));
            this.dice = [];
            for (var i = 0; i < 3; i++) {
                this.dice.push(new gameItems.Die(param));
                this.dice[i].component.move(500, 220 + i * 100);
                this.dice[i].randomValue();
                this.board.component.add(this.dice[i].component);
            }
            this.players = [];
            this.players.push(new HumanPlayer("Wilfried", "wilfried.jpg", this));
            this.players.push(new BotPlayer("Hewerald", "hewerald.jpg", this));
            this.board.component.add(this.players[0].component.move(0, 200));
            this.board.component.add(this.players[1].component.move(670, 200));
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

        process(player1) {
            let isAzar = ()=> {
                return this._sum() <= 5 || this._sum() >= 16;
            };
            let player2 = player1 === this.players[0] ? this.players[1] : this.players[0];
            if (this.status === "firstChance") {
                if (isAzar()) {
                    player1.win("Azar !");
                    player2.loose();
                    this.finished = true;
                }
                else {
                    player2.setChance(this._sum());
                }
            }
            else if (this.status === "secondChance") {
                if (isAzar()) {
                    player2.win();
                    player1.loose("Reazar !");
                    this.finished = true;
                }
                else {
                    if (this._sum() === player2.chanceValue) {
                        player1.setEquality("Same chance");
                        this.finished = true;
                    } else {
                        player1.setChance(this._sum());
                    }
                }
            }
            else {
                if (this._sum() === player1.chanceValue) {
                    player1.win(numbers[player1.chanceValue - 6] + " : Chance !");
                    player2.loose();
                    this.finished = true;
                }
                else if (this._sum() === player2.chanceValue) {
                    player2.win(numbers[player2.chanceValue - 6] + " : Chance !");
                    player1.loose();
                    this.finished = true;
                }
            }

        }

        startPlay() {
            delete this.finished;
            this.currentPlayerIndex = 0;
            this.status = "firstChance";
            this.players.forEach(function (player) {
                player.init()
            });
            this.players[this.currentPlayerIndex].play();
        }

        nextPlay() {
            if (!this.finished) {
                if (this.stop) {
                    this.mustPlay = true;
                    return;
                }
                if (this.status === "firstChance") {
                    this.status = "secondChance";
                }
                else {
                    this.status = "tryChance";
                    this.currentPlayerIndex = this.currentPlayerIndex ? 0 : 1;
                }
                this.players[this.currentPlayerIndex].play();
            }
        }

        rollDice() {
            this.dice.forEach(die=> {
                die.roll(svg.onChannel())
            });
        }

        _sum() {
            let result = 0;
            for (let die of this.dice) {
                result += die.value;
            }
            return result;
        }

        _again() {
            this.remove(self.board.component);
            this.board = new Board(param.size);
            this.add(this.board.component.move(100, 0));
        }
    }

    class Board {

        constructor(size) {
            this.component = new svg.Translation();
        }

    }

    class Player {

        constructor(name, url, game) {
            this.game = game;
            this.component = new svg.Translation().mark(name);
            this.imageBase = new svg.Translation()
                .add(new svg.Image(url).mark("image").position(200, 150).dimension(360, 270)/*.clickable()*/)
                .add(new svg.Text(name).font("Arial", 48, 96).position(200, 350));
            this.component.add(this.imageBase);
            this.frame = new svg.Rect(360, 270).position(200, 150).color([], 4, [255, 0, 0]).opacity(0);
            this.component.add(this.frame);
            this.mood = new gameItems.Smiley(function () {
                this.game.startPlay();
            }, ":|");
            this.component.add(this.mood.component.move(20, 300));
            this.chance = new svg.Text("?").mark("chance").font("Arial", 80).color([100, 100, 200]).position(200, 0);
            this.component.add(this.chance);
        }

        init() {
            this.mood.setType(":|");
            delete this.chanceValue;
            this.frame.opacity(0);
            this.chance.message("?");
        }

        setChance(value) {
            this.chanceValue = value;
            this.chance.message(numbers[value - 6]);
        }

        setEquality(text) {
            if (text) {
                this.chance.message(text);
            }
            this.mood.setType(":|");
        }

        win(text) {
            if (text) {
                this.chance.message(text);
            }
            this.mood.setType(":)");
        }

        loose(text) {
            if (text) {
                this.chance.message(text);
            }
            this.mood.setType(":(");
        }
    }

    class HumanPlayer extends Player {

        constructor(name, url, game) {
            super(name, url, game);
        }

        play() {
            this.frame.opacity(1);
            this.imageBase.onClick(()=> {
                this.imageBase.onClick(null);
                this.game.rollDice();
                svg.animate(param.speed * 50, ()=> {
                    this.game.process(this);
                    this.frame.opacity(0);
                    this.game.nextPlay();
                });
            });
        }
    }

    class BotPlayer extends Player {

        constructor(name, url, game) {
            super(name, url, game);
        }

        play() {
            this.frame.opacity(1);
            svg.animate(param.speed * 50, ()=> {
                this.game.rollDice();
                svg.animate(param.speed * 50, ()=> {
                    this.game.process(this);
                    this.frame.opacity(0);
                    this.game.nextPlay();
                });
            });
        }
    }

    var game;
    var menu = new gameItems.Menu("Azar", param);

    function createGame() {
        game = new Game(function () {
            game.destroy();
            menu.show();
        });
        menu.setGame(game, createGame);
        game.startPlay();
    }

    createGame();
};

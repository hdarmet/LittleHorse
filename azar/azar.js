/**
 * Created by HDA3014 on 16/01/2016.
 */
let GameItems = require("../gameitems.js").GameItems;

console.log("Horses loaded...");

exports.playAzar = function(svg, param) {

    var gameItems = new GameItems(svg);

    function Game(exit) {
        var self = this;

        self.destroy = function () {
            self.stop = true;
            self.canvas.hide();
        };

        self.resume = function () {
            delete self.stop;
            self.canvas.show("content");
            if (self.mustPlay) {
                delete self.mustPlay;
                self.nextPlay();
            }
        };

        self.add = function (component) {
            self.canvas.add(component);
        };

        self.remove = function (component) {
            self.canvas.remove(component);
        };

        self.canvas = new svg.Drawing(1200, 1000).show("content");
        self.add(new gameItems.Exit(exit).component.move(30, 30));
        var board = new Board();
        self.add(board.component.move(100, 0));
        var dice = [];
        for (var i=0; i<3; i++) {
            dice.push(new gameItems.Die(param));
            dice[i].component.move(500, 220+i*100);
            dice[i].randomValue();
            board.component.add(dice[i].component);
        }
        self.players = [];
        self.players.push(new HumanPlayer("Wilfried", "wilfried.jpg"));
        self.players.push(new BotPlayer("Hewerald", "hewerald.jpg"));
        board.component.add(self.players[0].component.move(0,200));
        board.component.add(self.players[1].component.move(670,200));

        var numbers = ["VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];

        self.process = function(player1) {
            var player2 = player1===self.players[0] ? self.players[1] : self.players[0];
            if (self.status==="firstChance") {
                if (isAzar()) {
                    player1.win("Azar !");
                    player2.loose();
                    self.finished = true;
                }
                else {
                    player2.setChance(sum());
                }
            }
            else if (self.status==="secondChance") {
                if (isAzar()) {
                    player2.win();
                    player1.loose("Reazar !");
                    self.finished = true;
                }
                else {
                    if (sum()===player2.chanceValue) {
                        player1.setChance("Same chance");
                        self.finished = true;
                    } else {
                        player1.setChance(sum());
                    }
                }
            }
            else {
                if (sum()===player1.chanceValue) {
                    player1.win(numbers[player1.chanceValue-6]+" : Chance !");
                    player2.loose();
                    self.finished = true;
                }
                else if (sum()===player2.chanceValue) {
                    player2.win(numbers[player2.chanceValue-6]+" : Chance !");
                    player1.loose();
                    self.finished = true;
                }
            }

            function isAzar() {
                return sum()<=5 || sum()>=16;
            }
        };

        function rollDice() {
            dice.forEach(function(die) {die.roll(svg.onChannel())});
        }

        function sum() {
            var result=0;
            for (var die in dice) {
                result += dice[die].value;
            }
            return result;
        }

        function again() {
            self.remove(self.board.component);
            self.board = new Board(param.size);
            self.add(self.board.component.move(100, 0));
        }

        function Board(size) {
            var self = this;
            self.component = new svg.Translation();
        }

        function Player(name, url) {
            var me = this;
            me.component = new svg.Translation();
            me.imageBase = new svg.Translation()
                .add(new svg.Image(url).position(200, 150).dimension(360, 270).clickable())
                .add(new svg.Text(name).font("Arial", 48, 96).position(200, 350));
            me.component.add(me.imageBase);
            me.frame = new svg.Rect(360, 270).position(200, 150).color([], 4, [255, 0, 0]).opacity(0);
            me.component.add(me.frame);
            me.mood = new gameItems.Smiley(function() {self.startPlay();}, ":|");
            me.component.add(me.mood.component.move(20, 300));
            me.chance = new svg.Text("?").font("Arial", 80).color([100, 100, 200]).position(200, 0);
            me.component.add(me.chance);

            me.init = function() {
                me.mood.setType(":|");
                delete me.chanceValue;
                me.frame.opacity(0);
                me.chance.message("?");
            };

            me.setChance = function(value) {
                me.chanceValue = value;
                me.chance.message(numbers[value-6]);
            };

            me.win = function(text) {
                if (text) {
                    me.chance.message(text);
                }
                me.mood.setType(":)");
            };

            me.loose = function(text) {
                if (text) {
                    me.chance.message(text);
                }
                me.mood.setType(":(");
            }
        }

        function HumanPlayer(name, url) {
            Player.call(this, name, url);
            var me = this;

            me.play = function() {
                me.frame.opacity(1);
                me.imageBase.onClick(function() {
                    me.imageBase.onClick(null);
                    rollDice();
                    svg.animate(param.speed*50, function() {
                        self.process(me);
                        me.frame.opacity(0);
                        self.nextPlay();
                    });
                });
            };
        }
        HumanPlayer.prototype.__proto__ = Player.prototype;

        function BotPlayer(name, url) {
            Player.call(this, name, url);
            var me = this;

            me.play = function() {
                me.frame.opacity(1);
                svg.animate(param.speed*50, function() {
                    rollDice();
                    svg.animate(param.speed * 50, function () {
                        self.process(me);
                        me.frame.opacity(0);
                        self.nextPlay();
                    });
                });
            };
        }
        BotPlayer.prototype.__proto__ = Player.prototype;

        self.startPlay = function () {
            delete self.finished;
            self.currentPlayerIndex = 0;
            self.status = "firstChance";
            self.players.forEach(function(player) {player.init()});
            self.players[self.currentPlayerIndex].play();
        };

        self.nextPlay = function () {
            if (!self.finished) {
                if (self.stop) {
                    self.mustPlay = true;
                    return;
                }
                if (self.status === "firstChance") {
                    self.status = "secondChance";
                }
                else {
                    self.status = "tryChance";
                    self.currentPlayerIndex = self.currentPlayerIndex ? 0 : 1;
                }
                self.players[self.currentPlayerIndex].play();
            }
        };
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

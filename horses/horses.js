/**
 * Created by HDA3014 on 01/01/2016.
 */
let GameItems = require("../gameitems.js").GameItems;

console.log("Horses loaded...");

exports.play = function(svg, param) {

    var gameItems = new GameItems(svg);

    class Game {

        constructor(exit) {
            this.canvas = new svg.Drawing(1200, 1000).show("content");
            this.players = [];
            this.die = new gameItems.Die(param);
            this.add(this.die.component.move(30, 30));
            this.add(new gameItems.Exit(exit).component.move(30, 120));
            this.board = new Board(this);
            this.add(this.board.component.move(100, 0));
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

        addPlayer(player) {
            this.players.push(player);
            player.horses.forEach(horse=>this.add(horse.component.move(100, 0)));
        }

        startPlay() {
            if (this.players.length > 0) {
                this.currentPlayerIndex = 0;
                this.players[this.currentPlayerIndex].play();
            }
        }

        nextPlay() {
            if (this.stop) {
                this.mustPlay = true;
                return;
            }
            if (!this.allFinished()) {
                if (this.die.value != 6 || this.players[this.currentPlayerIndex].finished()) {
                    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
                }
                this.players[this.currentPlayerIndex].play();
            }
        }

        getOrder() {
            var result = 0;
            for (let p of this.players) {
                if (p.finished()) {
                    result++;
                }
            }
            return result;
        }

        allFinished() {
            return this.getOrder() === this.players.length;
        }

    }

    class Square {

        constructor(game, x, y, index, fillColor, strokeColor) {
            this.component = new svg.Circle(25).position(x * 60 + 30, y * 60 + 30).color(fillColor, 4, strokeColor);
            this.slot = {x: x, y: y, index: index};
        }
    }

    class Stable {

        constructor(game, x, y, fillColor, strokeColor) {
            var frame = new svg.Rect(350, 350).position(175, 175).color(fillColor, 5, strokeColor);
            this.text = new svg.Text("").position(175, 250).color(strokeColor).font("Arial", 150);
            this.component = new svg.Translation(x * 60 + 5, y * 60 + 5).add(frame).add(this.text);
            this.slots = [{x: x + 2, y: y + 2}, {x: x + 3, y: y + 3}, {x: x + 3, y: y + 2}, {x: x + 2, y: y + 3}];
            this.finalSlots = [{x: x, y: y}, {x: x + 1, y: y}, {x: x + 2, y: y}, {x: x + 3, y: y}];
        }

        getFreeSlot() {
            for (let slot of this.slots) {
                if (!slot.horse) {
                    return slot;
                }
            }
            throw "No free slot ! Should never happen...";
        }

        setOrder(order) {
            this.text.message(order);
        }

        getFinalFreeSlot() {
            for (let slot of this.finalSlots) {
                if (!slot.horse) {
                    return slot;
                }
            }
            throw "No final free slot ! Should never happen...";
        }
    }

    class Scale {

        constructor(game, x, y, value, fillColor, strokeColor, angle) {
            this.component = new svg.Translation(x * 60, y * 60).add(new svg.Rect(50, 50).position(30, 30).color(fillColor, 5, strokeColor));
            var text = new svg.Text(value).position(0, 15).color(strokeColor).font("Arial", 48);
            this.component.add(new svg.Translation(30, 30).add(new svg.Rotation(angle).add(text)));
            this.slot = {x: x, y: y, index: value};
        }

    }

    class Center {

        constructor(game) {
            this.component = new svg.Translation(7 * 60, 7 * 60).add(new svg.Polygon(0, 0).add([[2, 58], [30, 30], [58, 58]]).color([0, 200, 0])).add(new svg.Polygon(0, 0).add([[2, 2], [30, 30], [2, 58]]).color([240, 204, 0])).add(new svg.Polygon(0, 0).add([[2, 2], [30, 30], [58, 2]]).color([0, 180, 180])).add(new svg.Polygon(0, 0).add([[58, 2], [30, 30], [58, 58]]).color([240, 120, 120]));
        }

    }

    class Board {

        constructor(game) {
            let createSquares=(x, y, fillColor, strokeColor, dx1, dy1, dx2, dy2)=> {
                var result = {
                    end: new Square(game, x, y, this.squares.length, fillColor, strokeColor),
                    begin: new Square(game, x + dx2, y + dy2, this.squares.length + 1, fillColor, strokeColor)
                };
                this.squares.push(result.end);
                this.squares.push(result.begin);
                this.component.add(result.begin.component).add(result.end.component);
                for (let i = 1; i <= 6; i++) {
                    var square = new Square(game, x + dx2 + i * dx1, y + dy2 + i * dy1, this.squares.length, fillColor, strokeColor);
                    this.squares.push(square);
                    this.component.add(square.component);
                }
                for (let i = 1; i <= 6; i++) {
                    square = new Square(game, x + dx2 + 6 * dx1 + i * dx2, y + dy2 + 6 * dy1 + i * dy2, this.squares.length, fillColor, strokeColor);
                    this.squares.push(square);
                    this.component.add(square.component);
                }
                return result;
            };

            let createScales= (x, y, fillColor, strokeColor, dx, dy, angle)=> {
                var scales = [];
                for (var i = 1; i <= 6; i++) {
                    var scale = new Scale(game, x + (i - 1) * dx, y + (i - 1) * dy, i, fillColor, strokeColor, angle);
                    scales.push(scale);
                    this.component.add(scale.component);
                }
                return scales;
            };

            let createStable=(x, y, fillColor, strokeColor)=> {
                var stable = new Stable(game, x, y, fillColor, strokeColor);
                this.component.add(stable.component);
                return stable;
            };

            this.component = new svg.Translation(0, 0);
            this.squares = [];
            this.entries = {};
            this.scales = {};
            this.stables = {};

            this.entries.green = createSquares(7, 14, [0, 255, 0], [0, 175, 0], 0, -1, -1, 0);
            this.entries.yellow = createSquares(0, 7, [255, 204, 0], [255, 102, 0], 1, 0, 0, -1);
            this.entries.blue = createSquares(7, 0, [0, 200, 200], [0, 100, 255], 0, 1, 1, 0);
            this.entries.red = createSquares(14, 7, [255, 100, 100], [255, 0, 0], -1, 0, 0, 1);

            this.scales.green = createScales(7, 13, [0, 200, 0], [0, 100, 0], 0, -1, 0);
            this.scales.yellow = createScales(1, 7, [240, 204, 0], [220, 100, 0], 1, 0, 90);
            this.scales.blue = createScales(7, 1, [0, 180, 180], [0, 80, 240], 0, 1, 180);
            this.scales.red = createScales(13, 7, [240, 120, 120], [240, 0, 0], -1, 0, 270);

            this.stables.green = createStable(0, 9, [0, 200, 0], [0, 100, 0]);
            this.stables.yellow = createStable(0, 0, [240, 204, 0], [220, 100, 0]);
            this.stables.blue = createStable(9, 0, [0, 180, 180], [0, 80, 240]);
            this.stables.red = createStable(9, 9, [240, 120, 120], [240, 0, 0]);

            this.component.add(new Center(game).component);
        }
    }

    class Horse {

        constructor(game, playerName, id, fillColor, strokeColor) {
            this.horse = new svg.Translation(0, 0);
            this.status = "InStable";
            this.name = playerName;
            this.id = id;
            this.fillColor = fillColor;
            this.strokeColor = strokeColor;
            this.head = new svg.Polygon(0, 0).add([[5, 20], [30, 5], [30, 35]]).color(fillColor, 4, strokeColor).clickable();
            this.corpse = new svg.Polygon(0, 0).add([[15, 55], [30, 5], [45, 55]]).color(fillColor, 4, strokeColor).clickable();
            this.horse.add(this.head).add(this.corpse);
            this.component = new svg.Translation().add(this.horse);
            this.setPosition(game.board.stables[this.name].getFreeSlot());
        }

        setPosition(slot) {
            if (this.slot) {
                if (this.slot === slot) return;
                if (this.slot.horse === this) {
                    delete this.slot.horse;
                }
            }
            this.slot = slot;
            this.slot.horse = this;
            this.horse.move(this.slot.x * 60, this.slot.y * 60);
        }

        eject() {
            this.status = "InStable";
            return this.moveTo(game.board.stables[this.name].getFreeSlot());
        }

        finish() {
            this.status = "Finished";
            return this.moveTo(game.board.stables[this.name].getFinalFreeSlot());
        }

        moveTo(slot) {
            let definePath = (startSlot, endSlot)=> {
                if (this.status != "InPlay" || startSlot.index == undefined || endSlot.index == undefined) {
                    return [startSlot, endSlot];
                }
                else {
                    var slots = [];
                    slots.push(startSlot);
                    for (
                        var index = (startSlot.index + 1) % game.board.squares.length;
                        index !== endSlot.index;
                        index = (index + 1) % game.board.squares.length) {
                        slots.push(game.board.squares[index].slot);
                    }
                    slots.push(endSlot);
                    return slots;
                }
            };

            var slots = definePath(this.slot, slot);
            for (var i = 0; i < slots.length - 1; i++) {
                this.horse.smoothy(param.speed, 10).move(slots[i].x * 60, slots[i].y * 60, slots[i + 1].x * 60, slots[i + 1].y * 60);
            }
            svg.animate(param.speed, this.setPosition, this, slot);
        }

        animateColors() {
            if (this.selectAnimation) {
                var channel = svg.onChannel();
                this.corpse.steppy(param.speed, 10).onChannel(channel).color(this.fillColor, this.strokeColor, 4, 4, this.strokeColor, this.fillColor);
                this.corpse.steppy(param.speed, 10).onChannel(channel).color(this.strokeColor, this.fillColor, 4, 4, this.fillColor, this.strokeColor);
                channel = svg.onChannel();
                this.head.steppy(param.speed, 10).onChannel(channel).color(this.fillColor, this.strokeColor, 4, 4, this.strokeColor, this.fillColor);
                this.head.steppy(param.speed, 10).onChannel(channel).color(this.strokeColor, this.fillColor, 4, 4, this.fillColor, this.strokeColor);
                channel.animate(param.speed, ()=>this.animateColors());
            }
        }

        activate(next) {
            this.horse.onClick(next);
            this.selectAnimation = true;
            this.animateColors();
        }

        desactivate() {
            this.horse.onClick(null);
            this.selectAnimation = false;
        }
    }

    function Popup(game, message, fillColor, strokeColor) {
        var self = this;
        self.component = new svg.Translation(0, 0)
            .add(new svg.Rect(300, 100).position(150, 50).color(fillColor, 4, strokeColor))
            .add(new svg.Text(message).position(150, 60).color(strokeColor).font("Arial", 48));
    }

    class Player {

        constructor(game, name, fillColor, strokeColor) {
            this.name = name;
            this.horses = [];
            for (var p = 0; p < param.horsesCount; p++) {
                this.horses.push(new Horse(game, name, p, fillColor, strokeColor));
            }
            this.popup = new Popup(game, name + " turn !", fillColor, strokeColor);
        }

        play() {
            if (!this.finished()) {
                this.showPlayerTurn();
            }
            else {
                game.nextPlay();
            }
        }

        finished() {
            for (var h in this.horses) {
                if (this.horses[h].status != "Finished") {
                    return false;
                }
            }
            return true;
        }

        showPlayerTurn() {
            game.add(this.popup.component.move(400, 400));
            svg.animate(param.speed * 20, this.rollDie, this);
        }

        rollDie() {
            game.remove(this.popup.component);
            game.die.roll();
            svg.animate(param.speed, ()=>this.playHorse(game.die.value));
        }

        isSameTeam(slot, name) {
            if (!slot.horse) {
                return false;
            }
            if (slot.horse.name != name) {
                return false;
            }
            return true;
        }

        isOtherTeam(slot, name) {
            if (!slot.horse) {
                return false;
            }
            if (slot.horse.name == name) {
                return false;
            }
            return true;
        }

        nextSlotIndex(horse, dieValue) {
            var index = (horse.slot.index + dieValue) % game.board.squares.length;
            return index;
        }

        mayMove(horse, dieValue) {
            if (horse.status !== "InPlay" || horse.slot.index === this.endSlot(this.name).index) {
                return false;
            }
            var nextIndex = this.nextSlotIndex(horse, dieValue);
            if (this.passThrowEnd(horse.slot.index, nextIndex, this.endSlot(this.name).index)) {
                return false;
            }
            return true;
        }

        passThrowEnd(currentIndex, nextIndex, endIndex) {
            if (currentIndex < nextIndex) {
                if (endIndex > currentIndex && endIndex < nextIndex) {
                    return true;
                }
            }
            else {
                if (endIndex > currentIndex || endIndex < nextIndex) {
                    return true;
                }
            }
            return false;
        }

        cannotMoveToFinish(horse, dieValue) {
            return horse.status != "InScale" || horse.slot.index !== 6 || dieValue !== 6;
        }

        moveToFinish(horse, dieValue) {
            if (this.cannotMoveToFinish(horse, dieValue)) return false;
            horse.finish();
            if (this.finished()) {
                game.board.stables[this.name].setOrder(game.getOrder());
            }
            svg.animate(param.speed, ()=>game.nextPlay());
            return true;
        }

        cannotMoveInScale(horse, dieValue) {
            if (horse.status == "InStable" || horse.status == "Finished") {
                return true;
            }
            if (horse.status == "InPlay" && (horse.slot.index !== this.endSlot(this.name).index || dieValue !== 1 || this.scaleSlot(this.name, dieValue).horse)) {
                return true;
            }
            if (horse.status == "InScale" && (horse.slot.index !== dieValue - 1 || this.scaleSlot(this.name, dieValue).horse)) {
                return true;
            }
            return false;
        }

        moveInScale(horse, dieValue) {
            if (this.cannotMoveInScale(horse, dieValue)) return false;
            horse.status = "InScale";
            horse.moveTo(this.scaleSlot(this.name, dieValue));
            svg.animate(param.speed, ()=>game.nextPlay());
            return true;
        }

        cannotMoveHorse(horse, dieValue) {
            if (!this.mayMove(horse, dieValue)) {
                return true;
            }
            var nextIndex = this.nextSlotIndex(horse, dieValue);
            if (this.isSameTeam(this.squareSlot(nextIndex), this.name)) {
                return true;
            }
            return false;
        }

        moveHorse(horse, dieValue) {
            if (this.cannotMoveHorse(horse, dieValue)) return false;
            var nextIndex = this.nextSlotIndex(horse, dieValue);
            var time = horse.moveTo(this.squareSlot(nextIndex));
            svg.animate(param.speed, ()=>game.nextPlay());
            return true;
        }

        cannotMoveHorseAndEject(horse, dieValue) {
            if (!this.mayMove(horse, dieValue)) {
                return true;
            }
            var nextIndex = this.nextSlotIndex(horse, dieValue);
            if (!this.isOtherTeam(this.squareSlot(nextIndex), this.name)) {
                return true;
            }
            return false;
        }

        moveHorseAndEject(horse, dieValue) {
            if (this.cannotMoveHorseAndEject(horse, dieValue)) return false;
            var nextIndex = this.nextSlotIndex(horse, dieValue);
            var time = horse.moveTo(this.squareSlot(nextIndex));
            this.squareSlot(nextIndex).horse.eject();
            svg.animate(param.speed, ()=>game.nextPlay());
            return true;
        }

        cannotPutHorseOnBoardAndEject(horse) {
            return horse.status !== "InStable" || !this.isOtherTeam(this.beginSlot(this.name), this.name);
        }

        putHorseOnBoardAndEject(horse, next) {
            if (this.cannotPutHorseOnBoardAndEject(horse)) return false;
            horse.status = "InPlay";
            var time = horse.moveTo(this.beginSlot(this.name));
            time = this.beginSlot(this.name).horse.eject(time);
            svg.animate(param.speed, ()=>game.nextPlay());
            return true;
        }

        cannotPutHorseOnBoard(horse) {
            return horse.status !== "InStable" || this.isSameTeam(this.beginSlot(this.name), this.name);
        }

        putHorseOnBoard(horse) {
            if (this.cannotPutHorseOnBoard(horse)) return false;
            horse.status = "InPlay";
            horse.moveTo(this.beginSlot(this.name));
            svg.animate(param.speed, ()=>game.nextPlay());
            return true;
        }

        beginSlot(name) {
            return game.board.entries[name].begin.slot;
        }

        endSlot(name) {
            return game.board.entries[name].end.slot;
        }

        scaleSlot(name, value) {
            return game.board.scales[name][value - 1].slot;
        }

        squareSlot(index) {
            return game.board.squares[index].slot;
        }

    }

    class HumanPlayer extends Player {

        constructor(game, name, fillColor, strokeColor, x, y) {
            super(game, name, fillColor, strokeColor);
        }

        playHorse(dieValue) {
            var canPlay = false;
            var blink = [];
            this.horses.forEach(horse=> {
                if (this.canActivate(horse, dieValue)) {
                    canPlay = true;
                    if (horse.activate(()=>this.playSelectedHorse(horse, dieValue))) {
                        blink.push(horse);
                    }
                }
            });
            if (!canPlay) {
                game.nextPlay();
            }
        }

        canActivate(horse, dieValue) {
            if (this.cannotMoveToFinish(horse, dieValue) &&
                this.cannotMoveInScale(horse, dieValue) &&
                this.cannotMoveHorseAndEject(horse, dieValue) &&
                this.cannotMoveHorse(horse, dieValue) &&
                (dieValue !== 6 || (
                this.cannotPutHorseOnBoardAndEject(horse) &&
                this.cannotPutHorseOnBoard(horse))))
                return false;
            return true;
        }

        playSelectedHorse(horse, dieValue) {
            this.horses.forEach(horse=>horse.desactivate());
            if (this.moveToFinish(horse, dieValue)) {
                return;
            }
            if (this.moveInScale(horse, dieValue)) {
                return;
            }
            if (dieValue === 6) {
                if (this.putHorseOnBoardAndEject(horse)) {
                    return;
                }
            }
            if (this.moveHorseAndEject(horse, dieValue)) {
                return;
            }
            if (dieValue === 6) {
                if (this.putHorseOnBoard(horse)) {
                    return;
                }
            }
            if (this.moveHorse(horse, dieValue)) {
                return;
            }
            game.nextPlay();
        }
    }

    class BotPlayer extends Player {

        constructor(game, name, fillColor, strokeColor, x, y) {
            super(game, name, fillColor, strokeColor);
        }

        playHorse(dieValue) {
            for (let horse of this.horses) {
                if (this.moveToFinish(horse, dieValue)) {
                    return;
                }
            }
            for (let horse of this.horses) {
                if (this.moveInScale(horse, dieValue)) {
                    return;
                }
            }
            if (dieValue === 6) {
                for (let horse of this.horses) {
                    if (this.putHorseOnBoardAndEject(horse)) {
                        return;
                    }
                }
            }
            for (let horse of this.horses) {
                if (this.moveHorseAndEject(horse, dieValue)) {
                    return;
                }
            }
            if (dieValue === 6) {
                for (let horse of this.horses) {
                    if (this.putHorseOnBoard(horse)) {
                        return;
                    }
                }
            }
            for (let horse of this.horses) {
                if (this.moveHorse(horse, dieValue)) {
                    return;
                }
            }
            game.nextPlay();
        }

    }

    var game;
    var menu = new gameItems.Menu("Little Horses", param);
    menu.optionsList("Speed", [
        {value:1, text:"1"},
        {value:2, text:"2"},
        {value:5, text:"5"},
        {value:10, text:"10"},
        {value:20, text:"20"},
        {value:100, text:"100"}
    ],55,"speed", 520, 350);
    menu.setPlayers("Players", "players", "type", 500, 650);
    menu.setLiveCount("Horses count", "horsesCount", 700, 350,
        function(i) {
            return new svg.Translation()
                .add(new svg.Polygon(i*25,0).add([[5,20],[30,5],[30,35]]).clickable())
                .add(new svg.Polygon(i*25,0).add([[15,55],[30,5],[45,55]]).clickable());
        }, 4,
        [[0, 255, 0], 4, [0, 100, 0]]);

    function createGame() {
        game = new Game(function () {
            game.destroy();
            menu.show();
        });
        menu.setGame(game, createGame);
        createPlayer("green", [0, 255, 0], [0, 100, 0], 2, 11);
        createPlayer("yellow", [255, 204, 0], [220, 100, 0], 2, 2);
        createPlayer("blue", [0, 200, 200], [0, 80, 240], 11, 2);
        createPlayer("red", [255, 100, 100], [240, 0, 0], 11, 11);
        game.startPlay();

        function createPlayer(playerName, fillColor, strokeColor, x, y) {
            if (param.players[playerName].type==="human") {
                game.addPlayer(new HumanPlayer(game, playerName, fillColor, strokeColor, x, y));
            }
            else if (param.players[playerName].type==="bot") {
                game.addPlayer(new BotPlayer(game, playerName, fillColor, strokeColor, x, y));
            }
        }
    }
    createGame();
};

/**
 * Created by HDA3014 on 05/01/2016.
 */
function Die() {
    var self = this;

    self.randomValue = function() {
        self.value = Math.floor(Math.random()*6+1);
    };

    self.toString = function() {
        return String(self.value);
    };

    self.randomValue();
}

function Dice() {
    var self = this;
    self.dice = [new Die(), new Die(), new Die()];

    self.roll = function() {
        self.dice.forEach(function(die) {die.randomValue()});
    };

    self.sum = function() {
        return self.dice.reduce(function(sum, value) {return Number(sum)+Number(value);}, 0);
    };

    self.isAzar = function() {
        return self.sum()<6 || self.sum()>15;
    };

    self.toString = function() {
        return self.dice.join(" + ");
    }
}

function Player(name) {
    var self = this;
    self.name = name;

    self.toString = function() {
        return self.name;
    }
}

function Game(players, dice) {
    var self = this;
    self.currentPlayer = 1;

    self.play = function() {
        if (!self.firstRoll()) {
            return;
        }
        if (!self.secondRoll()) {
            return;
        }
        while (self.subsequentRolls()) {}
    };

    self.firstRoll = function() {
        dice.roll();
        console.log(players[0]+" lance les des et fait "+dice+" : "+(dice.isAzar()?"Azar !":"Chance !"));
        if (dice.isAzar()) {
            console.log(players[0]+" a gagne !");
            return false;
        }
        else {
            console.log(players[1]+" reçoit "+dice.sum()+" comme score de chance !");
            players[1].chance = dice.sum();
            return true;
        }
    };

    self.secondRoll = function() {
        dice.roll();
        console.log(players[0]+" relance les des et fait "+dice+" : "+(dice.isAzar()?"Reazar !":"Chance !"));
        if (dice.isAzar()) {
            console.log(players[1]+" a gagne !");
            return false;
        }
        else {
            if (players[1].chance === dice.sum()) {
                console.log("Partie annulee !");
                return false;
            }
            else {
                console.log(players[0] + " reçoit " + dice.sum() + " comme score de chance !");
                players[0].chance = dice.sum();
                return true;
            }
        }
    };

    self.subsequentRolls = function() {
        dice.roll();
        console.log(players[self.currentPlayer]+" lance les des et fait "+dice+" : "+(dice.isAzar()?"Azar !":"Chance !"));
        for (var p in players) {
            if (players[p].chance===dice.sum()) {
                console.log(players[p]+" a gagne !");
                return false;
            }
        }
        if (dice.isAzar()) {
            console.log("Les azars sont ignorés...");
        }
        else {
            console.log(dice.sum()+" ne correspond à aucun score de chance...");
        }
        self.currentPlayer = self.currentPlayer ? 0 : 1;
        return true;
    }
}

new Game([new Player("Wilfried"), new Player("Hewerald")], new Dice()).play();
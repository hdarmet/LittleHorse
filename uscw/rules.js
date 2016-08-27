/**
 * Created by HDA3014 on 27/08/2016.
 */

var Hex = require("../uscw/hextools.js").Hex;
//var Memento = require("../memento").Memento;
//var GameItems = require("../gameitems").GameItems;

exports.Rules = function(hexM) {

    hexM.Unit.prototype.movementFactor = function() {
        return parseInt(this.bottomRight, 10);
    };

    hexM.Unit.prototype.attackFactor = function() {
        return parseInt(this.bottomLeft, 10);
    };

    hexM.Unit.prototype.rangeFactor = function() {
        return parseInt(this.upLeft, 10);
    };

    function forEachNearHex(hex, callback) {
        for (let dir of ["ne", "e", "se", "sw", "w", "nw"]) {
            let nearHex = hex[dir];
            if (nearHex) {
                callback(nearHex);
            }
        }
    }

    class Rule {

        constructor() {
        }

        movement(map, unit, ma, from, dir) {
        }

        getPlayer(map, unit) {
            if (!unit.player) {
                unit.player = map.findPlayer(unit.type);
                return unit
            }
            return unit.player;
        }

        getHexesInRange(unit, range) {
            let from = unit.hex;
            let zone = new Map;
            process(from, range);
            return zone;

            function process(hex, range) {
                if (hex && (!zone.has(hex) || zone.get(hex)<range)) {
                    zone.set(hex, range);
                    if (range>0) {
                        forEachNearHex(hex, nearHex=>process(nearHex, range - 1));
                    }
                }
            }
        }

    }

    class SimpleRule extends Rule {

        constructor() {
            super();
        }

        movement(map, unit, start, ma, from, dir) {
            if (ma>0) {
                if (this.inZOC(map, unit, from).length) {
                    return {auth: false}
                }
                else {
                    if (this.isRoad(from, dir, 0)) {
                        return ma>=0.5 ? {auth: true, ma: ma - 0.5} : {auth: false};
                    }
                    else if (this.isPath(from, dir, 0)) {
                        return ma>=1 ? {auth: true, ma: ma - 1} : {auth: false};
                    }
                    else if (this.isProhibited(from, dir)) {
                        return {auth: false};
                    }
                    else if (this.isRiver(from, dir, 0)) {
                        return (start===from) ? {auth: true, ma:0} : {auth: false};
                    }
                    else {
                        return ma>=1 ? {auth: true, ma: ma - 1} : {auth: false};
                    }
                }
            }
            else {
                return {auth:false}
            }
        }

        inZOC(map, unit, hex) {
            let friendlyPlayer = this.getPlayer(map, unit);
            let foes = [];
            forEachNearHex(hex, nearHex=>{
                nearHex.units.forEach(otherUnit=>{
                    if (otherUnit!==unit && this.getPlayer(map, otherUnit)!==friendlyPlayer) {
                        foes.add(otherUnit);
                    }
                });
            });
            return foes;
        }

        isRoad(hex, dir, minValue) {
            let road = hex.getLineEntry(dir, "road");
            return road && road>=minValue;
        }

        isPath(hex, dir, minValue) {
            let path = hex.getLineEntry(dir, "road");
            return path && path>=minValue;
        }

        isRiver(hex, dir, minValue) {
            let river = hex.getBorderSide(dir, "river");
            return river && river>=minValue;
        }

        isProhibited(hex, dir, minValue) {
            return !hex[dir] || hex[dir].getBorderSide("c", "river");
        }

        targets(map, unit) {
            let targets = [];
            let friendlyPlayer = this.getPlayer(map, unit);
            let range = this.getRange(unit);
            this.getHexesInRange(unit, range).forEach((hexRange, hex)=>hex.units.forEach(otherUnit=>{
                if (this.getPlayer(map, otherUnit)!==friendlyPlayer) {
                    targets.push(otherUnit);
                }
            }));
            return targets;
        }

        attackers(map, unit) {
            let attackers = [];
            let friendlyPlayer = this.getPlayer(map, unit);
            let range = this.getMaxRange(map);
            this.getHexesInRange(unit, range).forEach((hexRange, hex)=>hex.units.forEach(otherUnit=>{
                if (this.getPlayer(map, otherUnit)!==friendlyPlayer && this.getRange(otherUnit)<=range-hexRange) {
                    attackers.push(otherUnit);
                }
            }));
            return attackers;
        }

        gatherTargets(map, units) {
            let targets = new Map();
            units.forEach(unit=>this.targets(map, unit).forEach(target=>{
                let count = targets.get(target);
                targets.set(target, count ? count+1 : 1);
            }));
            let result = [];
            targets.forEach((count, target)=>{
                if (count===units.length) {
                    result.push(target);
                }
            });
            return result;
        }

        gatherAttackers(map, units) {
            let attackers = new Map();
            units.forEach(unit=>this.attackers(map, unit).forEach(attacker=>{
                let count = attackers.get(attacker);
                attackers.set(attacker, count ? count+1 : 1);
            }));
            let result = [];
            attackers.forEach((count, attacker)=>{
                if (count===units.length) {
                    result.push(attacker);
                }
            });
            return result;
        }

        selectedUnits(map) {
            return map.selected.filter(something=>something instanceof hexM.Unit);
        }

        highlightedUnits(map) {
            return map.highlighted.filter(something=>something instanceof hexM.Unit);
        }

        friends(map, units, player) {
            return units.filter(unit=>this.getPlayer(map, unit)===player);
        }

        foes(map, units, player) {
            return units.filter(unit=>this.getPlayer(map, unit)!==player);
        }

        friendSelected(map, unit, included) {
            let friendlyPlayer = this.getPlayer(map, unit);
            let friends = this.friends(map, this.selectedUnits(map), friendlyPlayer);
            if (included) {
                friends.push(unit);
            }
            else {
                friends.remove(unit);
            }
            let targets = this.gatherTargets(map, friends);
            if (targets.empty()) {
                if (included) {
                    targets = this.targets(map, unit);
                    this.selectUnits(map, unit);
                    this.highlightUnits(map, ...targets);
                }
                else {
                    map.unselectAll();
                    map.unhighlightAll();
                }
            }
            else {
                let selectedFoes = this.foes(map, this.selectedUnits(map), friendlyPlayer)
                    .filter(unit=>targets.contains(unit));
                let attackers = this.gatherAttackers(map, selectedFoes);
                this.selectUnits(map, ...friends, ...selectedFoes);
                this.highlightUnits(map, ...attackers, ...targets);
            }
        }

        foeSelected(map, unit, included) {
            let foePlayer = this.getPlayer(map, unit);
            let foes = this.friends(map, this.selectedUnits(map), foePlayer);
            if (included) {
                foes.push(unit);
            }
            else {
                foes.remove(unit);
            }
            let attackers = this.gatherAttackers(map, foes);
            if (attackers.empty()) {
                if (included) {
                    attackers = this.targets(map, unit);
                    this.selectUnits(map, unit);
                    this.highlightUnits(map, ...attackers);
                }
                else {
                    map.unselectAll();
                    map.unhighlightAll();
                }
            }
            else {
                let selectedFriends = this.foes(map, this.selectedUnits(map), foePlayer)
                    .filter(unit=>attackers.contains(unit));
                let targets = this.gatherTargets(map, selectedFriends);
                this.selectUnits(map, ...foes, ...selectedFriends);
                this.highlightUnits(map, ...attackers, ...targets);
            }
        }

        selectUnits(map, ...units) {
            let selected = this.selectedUnits(map);
            selected.forEach(unit=>units.contains(unit)||map.unselect(unit));
            units.forEach(unit=>selected.contains(unit)||map.select(unit, false));
        }

        highlightUnits(map, ...units) {
            let highlighted = this.highlightedUnits(map);
            highlighted.forEach(unit=>units.contains(unit)||map.unhighlight(unit));
            units.forEach(unit=>highlighted.contains(unit)||map.highlight(unit));
        }

        getRange(unit) {
            return unit.rangeFactor();
        }

        getMaxRange(map) {
            if (!map.maxRange) {
                let range=0;
                map.forEachHex(hex=>hex.units.forEach(unit=>{
                    let unitRange = this.getRange(unit);
                    if (range<unitRange) {
                        range = unitRange;
                    }
                }));
                map.maxRange = range;
            }
            return map.maxRange;
        }

    }

    return {
        Rule : Rule,
        SimpleRule : SimpleRule
    }

};
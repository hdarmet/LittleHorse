/**
 * Created by HDA3014 on 24/01/2016.
 */

var SVG = require("../svghandler.js").SVG;
var targetRuntime = require("../targetruntime.js").targetRuntime;
var Gui = require("../svggui").Gui;

var svg = SVG(targetRuntime());
var gui = Gui(svg);

var MARGIN = 30;
var REDUCTION_FACTOR = 2/3;
var SECOND_REDUCTION_FACTOR = 9/10;
var LINE_ENLARGE_FACTOR = 0.3;
var LINE_CONTROL_FACTOR = 0.5;
var HEX_WIDTH = 51;
var ALL_DIRECTIONS = ["ne", "e", "se", "sw", "w", "nw"];

var param = {
    speed:10,
    step:10
};

function Map(colCount, rowCount, width, ordered, background) {
    var self = this;
    this.hexWidth = width;
    this.rowCount = rowCount;
    this.colCount = colCount;
    this.rows = [];
    this.hexes = [];
    this.hexSupport = new svg.Translation();
    this.itemSupport = new svg.Translation();
    this.component = new svg.Translation();
    this.component.width = (colCount*2+1)*svg.Hexagon.height(width)+MARGIN*2;
    this.component.height = (rowCount*3+1)/2*width+MARGIN*2;
    this.component
        .add(new svg.Rect(this.component.width, this.component.height)
            .position(this.component.width/2, this.component.height/2).color(background))
        .add(this.hexSupport).add(this.itemSupport);
    createHexes();
    linkHexes();

    function createHexes() {
        for (var i = 0; i < rowCount; i++) {
            var row = [];
            self.rows.push(row);
            if (i % 2 === 1) {
                row.push(null);
            }
            for (var j = 0; j < colCount; j++) {
                var hex = new Hex(j*2+(i%2), i, width, ordered);
                hex.map = self;
                row.push(hex);
                row.push(hex);
                self.hexes.push(hex);
                self.hexSupport.add(hex.component);
                self.itemSupport.add(hex.itemSupport);
            }
        }
    }

    function linkHexes() {
        for (var i = 0; i < rowCount; i++) {
            for (var j = 0; j < colCount; j++) {
                var hex = self.rows[i][j * 2 + 1];
                if (i > 0) {
                    if (i % 2 === 1) {
                        hex.nw = self.rows[i - 1][j * 2];
                        if (j*2 < colCount*2 - 1) {
                            hex.ne = self.rows[i - 1][j * 2 + 2];
                        }
                    }
                    else {
                        hex.ne = self.rows[i - 1][j * 2 + 1];
                        if (j > 0) {
                            hex.nw = self.rows[i - 1][j * 2 - 1];
                        }
                    }
                }
                if (i < rowCount - 1) {
                    if (i % 2 === 1) {
                        hex.sw = self.rows[i + 1][j * 2];
                        if (j*2 < colCount*2 - 1) {
                            hex.se = self.rows[i + 1][j * 2 + 2];
                        }
                    }
                    else {
                        hex.se = self.rows[i + 1][j * 2 + 1];
                        if (j > 0) {
                            hex.sw = self.rows[i + 1][j * 2 - 1];
                        }
                    }
                }
                if (i % 2 === 1) {
                    if (j > 0) {
                        hex.w = self.rows[i][j * 2 - 1];
                    }
                    if (j * 2 < colCount*2 - 1) {
                        hex.e = self.rows[i][j * 2 + 3];
                    }
                }
                else {
                    if (j > 0) {
                        hex.w = self.rows[i][j * 2 - 2];
                    }
                    if (j*2 < colCount*2 - 1) {
                        hex.e = self.rows[i][j * 2 + 2];
                    }
                }
                //logHexeLinks(hex);
            }

        }
    }

    function logHexLinks(hex) {
        for (var d in ALL_DIRECTIONS) {
            hex[ALL_DIRECTIONS[d]]&&console.log(hex.toString()+" nw "+hex[ALL_DIRECTIONS[d]].toString());
        }
    }
}
Map.prototype.getHex = function(x, y) {
    return this.rows[y][x];
};
Map.prototype.getHexFromPoint = function(point) {
    var x = point.x-MARGIN;
    var y = point.y-MARGIN;
    var h = svg.Hexagon.height(this.hexWidth);
    var w = this.hexWidth/2;
    var c = Math.floor(x/h);
    var r = Math.floor(y/(w*3));
    if (r==this.rowCount) {
        r=this.rowCount-1;
    }
    if (c<0 || c>=this.colCount*2 || r<0 || r>=this.rowCount) {
        return null;
    }
    if ((y%(w*3))<w) {
        if ((c+r)%2) {
            if ((x%h)*w>(y%w)*h) {
                r--;
            }
        }
        else {
            if ((x%h)*w+(y%w)*h<h*w) {
                r--;
            }
        }
    }
    return r<0? null : this.rows[r][c];
};
Map.prototype.localPoint = function() {
    return this.component.localPoint.apply(this, arguments);
};
Map.prototype.globalPoint = function() {
    return this.component.globalPoint.apply(this, arguments);
};
Map.prototype.addGlasses = function(callback) {
    this.hexes.forEach(function(hex) {hex.addGlass(callback)});
    return this;
};
Map.prototype.removeGlasses = function() {
    this.hexes.forEach(function(hex) {hex.removeGlass()});
    return this;
};
Map.prototype.execute = function(action) {
    this.hexes.forEach(action);
    return this;
};

function Hex(x, y, width, ordered) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.hex = new svg.Hexagon(width, "V").color([120, 250, 120]);
    var height = this.hex.height();
    this.component = createSupport();
    this.ordered = makeOrdered(ordered);
    this.hexSupport = new svg.Ordered(ordered?ordered.length:0);
    this.component
        .add(this.hex)
        .add(this.hexSupport.active(false))
        .add(new svg.Hexagon(this.width, "V").color([], 2, [100, 100, 100]).opacity(0.3).active(false));
    this.itemSupport = createSupport();
    this.surfaces = {};
    this.lines = {};
    this.borders = {};
    this.items = [];

    function createSupport() {
        return new svg.Translation((x+1)*height+MARGIN, (y+1)*width*3/2-width/2+MARGIN);
    }
}
function makeOrdered(ordered) {
    ordered = ordered || [];
    var order = {};
    for (var i=0; i<ordered.length; i++) {
        order[ordered[i]] = i;
    }
    return order;
}
Hex.prototype.setOrder = function(ordered) {
    this.ordered = makeOrdered(ordered);
    this.hexSupport.order(ordered.length);
    return this;
};
Hex.prototype.setSurface = function(surface) {
    if (!this.surfaces[surface.type]) {
        this.surfaces[surface.type] = surface.setHex(this);
        this.hexSupport.set(this.ordered[surface.type], surface.component);
        surface.draw();
        this.nw && this.nw.drawSurface(surface.type);
        this.ne && this.ne.drawSurface(surface.type);
        this.e && this.e.drawSurface(surface.type);
        this.se && this.se.drawSurface(surface.type);
        this.sw && this.sw.drawSurface(surface.type);
        this.w && this.w.drawSurface(surface.type);
    }
    return this;
};
Hex.prototype.removeSurface = function(type) {
    if (this.surfaces[type]) {
        delete this.surfaces[type];
        this.hexSupport.unset(this.ordered[type]);
        this.nw && this.nw.drawSurface(type);
        this.ne && this.ne.drawSurface(type);
        this.e && this.e.drawSurface(type);
        this.se && this.se.drawSurface(type);
        this.sw && this.sw.drawSurface(type);
        this.w && this.w.drawSurface(type);
    }
    return this;
};
Hex.prototype.getSurface = function(type) {
    return this.surfaces[type];
};
Hex.prototype.drawSurface = function(type) {
    if (this.surfaces[type]) {
        this.surfaces[type].draw();
    }
};
Hex.prototype.setLine = function(line) {
    if (!this.lines[line.type]) {
        this.lines[line.type] = line.setHex(this);
        this.hexSupport.set(this.ordered[line.type], line.component);
        line.draw();
    }
    return this;
};
Hex.prototype.removeLine = function(type) {
    if (this.lines[type]) {
        delete this.lines[type];
        this.hexSupport.unset(this.ordered[type]);
    }
    return this;
};
Hex.prototype.getLine = function(type) {
    return this.lines[type];
};
Hex.prototype.setBorder = function(border) {
    if (!this.borders[border.type]) {
        this.borders[border.type] = border.setHex(this);
        this.hexSupport.set(this.ordered[border.type], border.component);
        border.draw();
    }
    return this;
};
Hex.prototype.removeBorder = function(type) {
    if (this.borders[type]) {
        delete this.borders[type];
        this.hexSupport.unset(this.ordered[type]);
    }
    return this;
};
Hex.prototype.getBorder = function(type) {
    return this.borders[type];
};
Hex.prototype.putItem = function(item, x, y) {
    if (this.items.add(item)) {
        if (x!=undefined) {
            item.component.move(x, y);
        }
        this.itemSupport.add(item.component);
        item.hex = this;
    }
    return this;
};
Hex.prototype.removeItem = function(item) {
    if (this.items.remove(item)) {
        this.itemSupport.remove(item.component);
        item.hex = null;
    }
    return this;
};
Hex.prototype.getItem = function(type) {
    for (var i=0; i<this.items.length; i++) {
        if (this.items[i] instanceof type) {
            return this.items[i];
        }
    }
    return null;
};
Hex.prototype.height =function() {
    return this.hex.height();
};
Hex.prototype.toString = function() {
    return "Hex : "+this.x+","+this.y+" ";
};
Hex.prototype.addGlass = function(callback) {
    var self = this;
    svg.addEvent(this.hex, 'click', function (event) {
        var local = self.hex.localPoint(event.clientX, event.clientY);
        callback(self, local.x, local.y, self.getPiece(local), self.isCenter(local));
    });
    svg.removeEvent(this.hex, 'mousedown');
    return this;
};
Hex.prototype.isCenter = function(local) {
    console.log(local.x+" "+local.y+" "+this.width);
    return local.x*local.x+local.y*local.y<this.width*this.width/4;
};
Hex.prototype.localPoint = function() {
    return this.component.localPoint.apply(this, arguments);
};
Hex.prototype.globalPoint = function() {
    return this.component.globalPoint.apply(this, arguments);
};
Hex.prototype.getPiece = function(local) {
    var slope = this.width/2/this.height();
    if (local.x<=0) {
        if (local.x*slope>local.y) {
            return "nw";
        }
        else if (local.x*slope>-local.y) {
            return "sw";
        }
        else {
            return "w";
        }
    }
    else {
        if (local.x*slope<-local.y) {
            return "ne";
        }
        else if (local.x*slope<local.y) {
            return "se";
        }
        else {
            return "e";
        }
    }
};

function Surface(type, colors) {
    this.type = type;
    this.colors = colors;
    this.component = new svg.Translation();
}
Surface.prototype.setHex = function(hex) {
    this.hex = hex;
    return this;
};
Surface.prototype.draw = function() {
    var self = this;
    var x = 0;
    var y = 0;
    if (self.back) {
        self.component.remove(self.back);
        delete self.back;
        self.component.remove(self.path);
        delete self.path;
    }
    process("ne", "e", "se", 0);
    process("e", "se", "sw", 60);
    process("se", "sw", "w", 120);
    process("sw", "w", "nw", 180);
    process("w", "nw", "ne", 240);
    process("nw", "ne", "e", 300);
    if (self.path) {
        self.component.add(self.back.opacity(0.7).color(this.colors[0]));
        self.component.add(self.path.opacity(0.7).color([], this.colors[1], this.colors[2]));
    }

    function process(leftDir, direction, rightDirection, angle) {
        var point;
        var control1;
        var control2;
        if (same(direction)) {
            if (same(leftDir)) {
                point = rotate(self.hex.height(), -self.hex.width/2, angle);
            }
            else {
                point = rotate(self.hex.height(), -self.hex.width/2*SECOND_REDUCTION_FACTOR, angle);
            }
            if (!self.back) {
                self.back = new svg.Path(point.x, point.y);
                self.path = new svg.Path(point.x, point.y);
            }
            if (same(rightDirection)) {
                point = rotate(self.hex.height(), self.hex.width/2, angle);
            }
            else {
                point = rotate(self.hex.height(), self.hex.width/2*SECOND_REDUCTION_FACTOR, angle);
            }
            self.back.line(point.x, point.y);
            self.path.move(point.x, point.y);
        }
        else {
            var rx = self.hex.height()*(0.5+SECOND_REDUCTION_FACTOR/2);
            var ry = self.hex.width/2*(1.5-SECOND_REDUCTION_FACTOR/2);
            var dx = self.hex.height()*REDUCTION_FACTOR;
            var dy = self.hex.width/2*REDUCTION_FACTOR;
            if (same(leftDir)) {
                point = rotate(rx, -ry, angle);
                control1 = rotate(rx-dy/3, -ry+dx/3, angle);
            }
            else {
                point = rotate(dx, -dy, angle);
                control1 = rotate(dx+dy/3, -dy+dx/3, angle);
            }
            if (!self.back) {
                self.back = new svg.Path(point.x, point.y);
                self.path = new svg.Path(point.x, point.y);
            }
            if (same(rightDirection)) {
                point = rotate(rx, ry, angle);
                control2 = rotate(rx-dy/3, ry-dx/3, angle);
            }
            else {
                point = rotate(dx, dy, angle);
                control2 = rotate(dx+dy/3, dy-dx/3, angle);
            }
            self.back.cubic(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
            self.path.cubic(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
        }
    }

    function same(direction) {
        return !self.hex[direction] || self.hex[direction].surfaces[self.type];
    }
};

function Border(type, sides, colors) {
    this.type = type;
    this.sides = sides;
    this.colors = colors;
    this.component = new svg.Translation();
}
Border.prototype.addSide = function(direction, value) {
    this.sides[direction]=value;
    this.draw();
    return this;
};
Border.prototype.removeSide = function(direction) {
    delete this.sides[direction];
    this.draw();
    return this;
};
Border.prototype.getSide = function(direction) {
    return this.sides[direction];
};
Border.prototype.getSides = function() {
    return this.sides;
};
Border.prototype.setHex = function(hex) {
    this.hex = hex;
    return this;
};
Border.prototype.draw = function() {
    var self = this;
    var x = 0;
    var y = 0;
    this.component.clear();
    if (!processCenter()) {
        process("ne", "e", "se", 0);
        process("e", "se", "sw", 60);
        process("se", "sw", "w", 120);
        process("sw", "w", "nw", 180);
        process("w", "nw", "ne", 240);
        process("nw", "ne", "e", 300);
    }

    function processCenter() {
        if (hasBorder("c")) {
            self.component.add(new svg.Hexagon(self.hex.width, "V").color(self.colors[0]));
            return true;
        }
        return false;
    }

    function process(leftDirection, direction, rightDirection, angle) {
        var start;
        var point;
        var control1;
        var control2;
        var back = null;
        var border = null;
        if (hasBorder(direction)) {
            console.log("Dir "+direction+" "+self.sides[direction]);
            var cx = self.hex.height();
            var cy = self.hex.width/2;
            var rx = self.hex.height()*(0.5+SECOND_REDUCTION_FACTOR/2);
            var ry = self.hex.width/2*(1.5-SECOND_REDUCTION_FACTOR/2);
            var dx = self.hex.height()*getReductionFactor();
            var dy = self.hex.width/2*getReductionFactor();
            start = rotate(cx, -cy, angle);
            back = new svg.Path(start.x, start.y);
            border = new svg.Path(start.x, start.y);
            if (hasBorder(leftDirection)) {
                point = rotate(dx, -dy, angle);
                back.line(point.x, point.y);
                border.move(point.x, point.y);
                control1 = rotate(dx+dy/3, -dy+dx/3, angle);
            }
            else {
                point = rotate(rx, -ry, angle);
                back = new svg.Path(point.x, point.y);
                border = new svg.Path(point.x, point.y);
                control1 = rotate(rx-dy/3, -ry+dx/3, angle);
            }
            if (hasBorder(rightDirection)) {
                point = rotate(dx, dy, angle);
                control2 = rotate(dx+dy/3, dy-dx/3, angle);
            }
            else {
                point = rotate(rx, ry, angle);
                control2 = rotate(rx-dy/3, ry-dx/3, angle);
            }
            back.cubic(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
            border.cubic(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
            point = rotate(cx, cy, angle);
            back.line(point.x, point.y);
            back.line(start.x, start.y);
            self.component.add(back.color(self.colors[0]));
            self.component.add(border.color([], self.colors[1], self.colors[2]));
        }
    }

    function getReductionFactor() {
        var factor = 1;
        if (self.sides.ne && self.sides.ne<factor) factor=self.sides.ne;
        if (self.sides.e && self.sides.e<factor) factor=self.sides.e;
        if (self.sides.se && self.sides.se<factor) factor=self.sides.se;
        if (self.sides.sw && self.sides.sw<factor) factor=self.sides.sw;
        if (self.sides.w && self.sides.w<factor) factor=self.sides.w;
        if (self.sides.nw && self.sides.nw<factor) factor=self.sides.nw;
        console.log("rf :"+factor+" "+self.sides);
        return factor;
    }

    function hasBorder(direction) {
        return self.sides[direction];
    }
};

function rotate(x, y, angle) {
    angle = angle/180*Math.PI;
    return {
        x: Math.round(x*Math.cos(angle)- y*Math.sin(angle)),
        y: Math.round(x*Math.sin(angle)+ y*Math.cos(angle))
    }
}

function inverseDirection(direction) {
    switch (direction) {
        case "ne": return "sw";
        case "e": return "w";
        case "se": return "nw";
        case "sw": return "ne";
        case "w": return "e";
        case "nw": return "se";
    }
}

function isEmpty(coll) {
    var result = true;
    for (var d in ALL_DIRECTIONS) {
        result &= coll[ALL_DIRECTIONS[d]]===undefined;
    }
    return result;
}

function Line(type, entries, colors) {
    this.type = type;
    this.colors = colors;
    this.entries = entries;
    this.component = new svg.Translation();
}
Line.prototype.addEntry = function(direction, value) {
    this.entries[direction]=value;
    this.draw();
    return this;
};
Line.prototype.removeEntry = function(direction) {
    delete this.entries[direction];
    this.draw();
    return this;
};
Line.prototype.getEntry = function(direction) {
    return this.entries[direction];
};
Line.prototype.getEntries = function() {
    return this.entries;
};
Line.prototype.setHex = function(hex) {
    this.hex = hex;
    return this;
};
Line.prototype.draw = function() {
    var self = this;
    var x = 0;
    var y = 0;
    var emptySteps=0;
    if (self.path) {
        self.component.remove(self.back);
        delete self.back;
        self.component.remove(self.path);
        delete self.path;
    }
    var firstEntry = startProcess("e", null, 0);
    var control = endProcess("e", 0);
    firstEntry = startProcess("se", control, 60) || firstEntry;
    control = endProcess("se", 60) || enlarge(control);
    firstEntry = startProcess("sw", control, 120) || firstEntry;
    control = endProcess("sw", 120) || enlarge(control);
    firstEntry = startProcess("w", control, 180) || firstEntry;
    control = endProcess("w", 180) || enlarge(control);
    firstEntry = startProcess("nw", control, 240) || firstEntry;
    control = endProcess("nw", 240) || enlarge(control);
    firstEntry = startProcess("ne", control, 300) || firstEntry;
    control = endProcess("ne", 300) || enlarge(control);
    if (firstEntry) {
        for (var i=0; i<emptySteps; i++) {
            control.x*=LINE_ENLARGE_FACTOR;
        }
        startProcess(firstEntry[0], control, firstEntry[1]);
    }
    if (self.path) {
        self.component.add(self.back.color(this.colors[0]));
        self.component.add(self.path.color([], this.colors[1], this.colors[2]));
    }

    function enlarge(control) {
        if (control) {
            control.x*=LINE_ENLARGE_FACTOR
        }
        else {
            emptySteps+=1;
        }
        return control;
    }

    function endProcess(entry, angle) {
        var point;
        if (self.entries[entry]) {
            point = rotate(self.hex.height(), 0, angle);
            if (!self.path) {
                self.back = new svg.Path(point.x, point.y);
                self.path = new svg.Path(point.x, point.y);
            }
            else {
                self.back.line(point.x, point.y);
            }
            var wideness = self.entries[entry]*self.hex.width;
            point = rotate(self.hex.height(), wideness/2, angle);
            self.back.line(point.x, point.y);
            self.path.move(point.x, point.y);
            point = rotate(self.hex.height()*.75, wideness/2, angle);
            self.back.line(point.x, point.y);
            self.path.line(point.x, point.y);
            return {x:self.hex.height()*LINE_CONTROL_FACTOR, y:wideness/2, angle:angle};
        }
        else {
            return null;
        }
    }

    function startProcess(entry, control1, angle) {
        var point;
        var control2;
        if (self.entries[entry]) {
            if (!self.path) {
                return [entry, angle];
            }
            control1 = rotate(control1.x, control1.y, control1.angle);
            var wideness = self.entries[entry]*self.hex.width;
            control2 = rotate(self.hex.height()*LINE_CONTROL_FACTOR, -wideness/2, angle);
            point = rotate(self.hex.height() *.75, -wideness/2, angle);
            self.back.cubic(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
            self.path.cubic(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
            point = rotate(self.hex.height(), -wideness/2, angle);
            self.back.line(point.x, point.y);
            self.path.line(point.x, point.y);
            point = rotate(self.hex.height(), 0, angle);
            self.back.line(point.x, point.y);
        }
        return null;
    }
};

var ANCHOR_MARGIN=10;

function Item(angle, glass) {
    var self = this;
    self.base = new svg.Translation();
    self.rotation = new svg.Rotation(angle);
    self.component = new svg.Translation().add(self.rotation.add(self.base));
    self.glass = glass;
    self.rotation.add(self.glass);
    self.events = {};
}
Item.prototype.rotate = function(angle) {
    this.rotation.rotate(angle);
    return this;
};
Item.prototype.move = function(x, y) {
    this.component.move(x, y);
    return this;
};
Item.prototype.addEvent = function(eventName, handler) {
    svg.addEvent(this.glass, eventName, handler);
    this.events[eventName] = handler;
};
Item.prototype.removeEvent = function(eventName) {
    svg.removeEvent(this.glass, eventName, this.events[eventName]);
    delete this.events[eventName];
};
Object.defineProperty(Item.prototype, "angle", { get: function () { return this.rotation.angle; } });
Object.defineProperty(Item.prototype, "x", { get: function () { return this.component.x; } });
Object.defineProperty(Item.prototype, "y", { get: function () { return this.component.y; } });

function Composite(angle, width) {
    Item.call(this, angle, new svg.Hexagon(width, "V").color([255, 0, 0], 0, []).opacity(0.001));
    this.width = width;
    this.children = [];
}
Composite.prototype.__proto__ = Item.prototype;
Composite.prototype.highlight = function(flag) {
    this.glass.opacity(flag?0.2:0.001);
    return this;
};
Composite.prototype.isHighlighted = function() {
    var result = this.glass._opacity===0.2;
    return result;
};
Composite.prototype.add = function(item) {
    if (this.children.add(item)) {
        this.base.add(item.component);
    }
    return this;
};
Composite.prototype.remove = function(item) {
    if (this.children.remove(item)) {
        this.base.remove(item.component);
    }
    return this;
};
Composite.prototype.conform = function() {
    for (var i = 0; i < this.children.length; i++) {
        var item = this.children[i];
        item.rotate(item.angle+this.angle);
        var point = svg.rotate(item.x, item.y, this.angle);
        item.move(point.x, point.y);
    }
    this.rotate(0);
};
Composite.prototype.clear = function() {
    var item;
    while (item=this.children.pop()) {
        this.base.remove(item.component);
    }
    return this;
};
Composite.prototype.anchor = function(x, y) {
    for (var i=0; i<this.glass.points.length; i++) {
        var point = this.glass.points[i];
        var dist = (point.x-x)*(point.x-x)+(point.y-y)*(point.y-y);
        if (dist<ANCHOR_MARGIN*ANCHOR_MARGIN) {
            return {x:x, y:y};
        }
    }
    return null;
};
Composite.prototype.duplicate = function() {
    var dup = new Composite(this.angle, this.width);
    dup.copy(this.children);
    return dup;
};
Composite.prototype.copy = function(items) {
    for (var i=0; i<items.length; i++) {
        this.add(items[i].duplicate());
    }
    return this;
};

function House(width, height, colors, angle) {
    var self = this;
    Item.call(this, angle, new svg.Rect(width, height).color([0, 0, 0]).opacity(0.001));
    self.width = width;
    self.height = height;
    self.colors = colors;
    self.base
        .add(new svg.Rect(width, height).color(colors[0], colors[1], colors[2]))
        .add(new svg.Line(-width/2, -height/2, -width/2+height/2, 0).color(colors[0], colors[1], colors[2]))
        .add(new svg.Line(-width/2, height/2, -width/2+height/2, 0).color(colors[0], colors[1], colors[2]))
        .add(new svg.Line(-width/2+height/2, 0, width/2-height/2, 0).color(colors[0], colors[1], colors[2]))
        .add(new svg.Line(width/2, -height/2, width/2-height/2, 0).color(colors[0], colors[1], colors[2]))
        .add(new svg.Line(width/2, height/2, width/2-height/2, 0).color(colors[0], colors[1], colors[2]));
}
House.prototype.__proto__ = Item.prototype;
House.prototype.anchor = function(x, y) {
    var anchorX = null;
    var anchorY = null;
    if (x<-this.glass.width/2+ANCHOR_MARGIN) {
        anchorX = -this.glass.width/2;
    }
    if (x>this.glass.width/2-ANCHOR_MARGIN) {
        anchorX = this.glass.width/2;
    }
    if (y<-this.glass.height/2+ANCHOR_MARGIN) {
        anchorY = -this.glass.height/2;
    }
    if (y>this.glass.height/2-ANCHOR_MARGIN) {
        anchorY = this.glass.height/2;
    }
    return anchorX!=null && anchorY!=null ? {x:anchorX, y:anchorY} : null;
};
House.prototype.duplicate = function() {
    var house = new House(this.width, this.height, this.colors, this.angle);
    if (this.x!=undefined) {
        house.move(this.x, this.y);
    }
    return house;
};

function RoundOpenTower(radius, colors) {
    var self = this;
    Item.call(this, 0, new svg.Circle(radius).color([0, 0, 0]).opacity(0.001));
    self.radius = radius;
    self.colors = colors;
    self.base
        .add(new svg.Circle(radius).color(colors[0], colors[1], colors[2]))
        .add(new svg.Circle(Math.round(radius*0.8)).color(colors[0], colors[1], colors[2]));
}
RoundOpenTower.prototype.__proto__ = Item.prototype;
RoundOpenTower.prototype.anchor = function(x, y) {
    return null;
};
RoundOpenTower.prototype.duplicate = function() {
    var tower = new RoundOpenTower(this.radius, this.colors);
    if (this.x!=undefined) {
        tower.move(this.x, this.y);
    }
    return tower;
};

function SquareOpenTower(width, height, colors, angle) {
    var self = this;
    Item.call(this, angle, new svg.Rect(width, height).color([0, 0, 0]).opacity(0.001));
    self.width = width;
    self.height = height;
    self.colors = colors;
    self.base
        .add(new svg.Rect(width, height).color(colors[0], colors[1], colors[2]))
        .add(new svg.Rect(Math.round(width*0.8), Math.round(height*0.8)).color(colors[0], colors[1], colors[2]));
}
SquareOpenTower.prototype.__proto__ = Item.prototype;
SquareOpenTower.prototype.anchor = function(x, y) {
    var anchorX = null;
    var anchorY = null;
    if (x<-this.glass.width/2+ANCHOR_MARGIN) {
        anchorX = -this.glass.width/2;
    }
    if (x>this.glass.width/2-ANCHOR_MARGIN) {
        anchorX = this.glass.width/2;
    }
    if (y<-this.glass.height/2+ANCHOR_MARGIN) {
        anchorY = -this.glass.height/2;
    }
    if (y>this.glass.height/2-ANCHOR_MARGIN) {
        anchorY = this.glass.height/2;
    }
    return anchorX!=null && anchorY!=null ? {x:anchorX, y:anchorY} : null;
};
SquareOpenTower.prototype.duplicate = function() {
    var tower = new SquareOpenTower(this.width, this.height, this.colors, this.angle);
    if (this.x!=undefined) {
        tower.move(this.x, this.y);
    }
    return tower;
};

function Bridge(width, height, colors, angle) {
    var self = this;
    var BORDER_FACTOR = 1;
    Item.call(this, angle, new svg.Rect(width, height).color([0, 0, 0]).opacity(0.001));
    self.width = width;
    self.height = height;
    self.colors = colors;
    self.base
        .add(new svg.Rect(width, height).color(colors[0], colors[1], colors[2]))
        .add(new svg.Polygon(0, 0)
            .add(-width/2, -height/2).trace(-height/3, -height/3).trace(height/6, -height/6)
            .add(-width/2+height/4, -height/2-height/4)
            .add(width/2-height/4, -height/2-height/4).trace(height*(5/12), -height/4).trace(height/6, height/6)
            .add(width/2, -height/2)
            .color(colors[0], colors[1], colors[2]))
        .add(new svg.Polygon(0, 0)
            .add(-width/2, height/2).trace(-height/3, height/3).trace(height/6, height/6)
            .add(-width/2+height/4, height/2+height/4)
            .add(width/2-height/4, height/2+height/4).trace(height*(5/12), height/4).trace(height/6, -height/6)
            .add(width/2, height/2)
            .color(colors[0], colors[1], colors[2]));
}
Bridge.prototype.__proto__ = Item.prototype;
Bridge.prototype.anchor = function(x, y) {
    var anchorX = null;
    var anchorY = null;
    if (x<-this.glass.width/2+ANCHOR_MARGIN) {
        anchorX = -this.glass.width/2;
    }
    if (x>this.glass.width/2-ANCHOR_MARGIN) {
        anchorX = this.glass.width/2;
    }
    if (y<-this.glass.height/2+ANCHOR_MARGIN) {
        anchorY = -this.glass.height/2;
    }
    if (y>this.glass.height/2-ANCHOR_MARGIN) {
        anchorY = this.glass.height/2;
    }
    return anchorX!=null && anchorY!=null ? {x:anchorX, y:anchorY} : null;
};
Bridge.prototype.duplicate = function() {
    var bridge = new Bridge(this.width, this.height, this.colors, this.angle);
    if (this.x!=undefined) {
        bridge.move(this.x, this.y);
    }
    return bridge;
};

function Tree(points, colors, angle) {
    var self = this;
    Item.call(this, angle, createGlass());
    self.points = points;
    self.colors = colors;
    self.component = new svg.Translation().add(new svg.Rotation(angle).add(self.base));
    self.base.add(createTree());

    function createGlass() {
        var start = true;
        var glass = new svg.Polygon(0, 0);
        for (var i=0; i<points.length; i++) {
            glass.add(points[i].x, points[i].y);
        }
        return glass;
    }

    function createTree() {
        var start = true;
        var tree = new svg.Path().color(colors[0], colors[1], colors[2]);
        for (var i=0; i<points.length; i++) {
            var point = points[i];
            var prevPoint = i===0?points[points.length-1]:points[i-1];
            var nextPoint = i===points.length-1?points[0]:points[i+1];
            var startMiddle = {x:(prevPoint.x+point.x)/2, y:(prevPoint.y+point.y)/2};
            var lastMiddle = {x:(nextPoint.x+point.x)/2, y:(nextPoint.y+point.y)/2};
            if (start) {
                tree.move(startMiddle.x, startMiddle.y);
                start = false;
            }
            tree.bezier(point.x, point.y, lastMiddle.x, lastMiddle.y);
        }
        return tree;
    }

}
Tree.prototype.__proto__ = Item.prototype;
Tree.prototype.anchor = function(x, y) {
    return x*x+y*y>ANCHOR_MARGIN*ANCHOR_MARGIN ? {x:x, y:y} : null;
};
Tree.prototype.duplicate = function() {
    var tree = new Tree(this.points, this.colors, this.angle);
    if (this.x!=undefined) {
        tree.move(this.x, this.y);
    }
    return tree;
};

function HexSupport(hex, pane) {
    var self = this;
    this.hex = hex;
    this.pane = pane;
    this.component = new svg.Translation();
    this.component.add(hex.component.move(0, 0));
    this.component.add(hex.itemSupport.move(0, 0).active(false));
    this.component.add(new svg.Hexagon(hex.width, "V").color([], 2, [10, 100, 10]));
    if (this.register()) {
        this.select();
    }
    hex.addGlass(function() {
        self.tool.callback(self.select());
    });
}
HexSupport.prototype.action = function(callback) {
    if (!this.tool) {
        this.tool = new gui.Tool(this.component, callback);
        this.tool.hex = this.hex;
        this.pane.addTool(this.tool);
    }
    else {
        this.tool.callback = callback;
    }
    this.tool.callback(true);
    return this;
};
HexSupport.prototype.register = function() {
    if (!this.pane.palette.hexTools) {
        this.pane.palette.hexTools = [];
    }
    this.pane.palette.hexTools.push(this);
    return this.pane.palette.hexTools.length===1;
};
HexSupport.prototype.whenSelect = function(selectCallback) {
    this.selectCallback = selectCallback;
    return this;
};
HexSupport.prototype.whenUnselect = function(unselectCallback) {
    this.unselectCallback = unselectCallback;
    return this;
};
HexSupport.prototype.select = function() {
    if (!this.selected) {
        this.pane.palette.hexTools.forEach(function(hexSupport) {hexSupport.unselect();});
        this.selected = new svg.Hexagon(this.hex.width, "V").color([], 4, [220, 0, 0]);
        this.component.add(this.selected);
        this.selectCallback && this.selectCallback();
        return true;
    }
    return false;
};
HexSupport.prototype.unselect = function() {
    if (this.selected) {
        this.component.remove(this.selected);
        delete this.selected;
        this.unselectCallback && this.unselectCallback();
        return true;
    }
    return false;
};
HexSupport.prototype.surface = function(type, colors) {
    var self = this;
    this.hex.setOrder([type]).setSurface(new Surface(type, colors));
    this.action(function() {
        self.pane.palette.action = function (hex) {
            if (hex.getSurface(type)) {
                hex.removeSurface(type);
            }
            else {
                hex.setSurface(new Surface(type, colors));
            }
        }
    });
};
HexSupport.prototype.line = function(type, size, colors) {
    var self = this;
    this.hex.setOrder([type]).setLine(new Line(type, {sw:size, e:size}, colors));
    this.action(function() {
        self.pane.palette.action = function(hex, x, y, piece) {
            var invDir = inverseDirection(piece);
            var invHex = hex[piece];
            if (getEntry(hex, piece, type)) {
                removeEntry(hex, piece, type);
                invHex && removeEntry(invHex, invDir, type);
            }
            else {
                addEntry(hex, piece, type, size, colors);
                invHex && addEntry(invHex, invDir, type, size, colors);
            }

            function getEntry(hex, direction, type) {
                var line = hex.getLine(type);
                return line ? line.getEntry(direction) : null;
            }
            function addEntry(hex, direction, type, value, colors) {
                var line = hex.getLine(type);
                if (line) {
                    line.addEntry(direction, value);
                }
                else {
                    line = new Line(type, {}, colors);
                    hex.setLine(line);
                    line.addEntry(direction, value);
                }
            }
            function removeEntry(hex, direction, type) {
                var line = hex.getLine(type);
                if (line) {
                    line.removeEntry(direction);
                    if (isEmpty(line.getEntries())) {
                        hex.removeLine(type);
                    }
                }
            }
        }
    });
};
HexSupport.prototype.border = function(type, size, colors) {
    var self = this;
    this.hex.setOrder([type]).setBorder(new Border(type, {w:size, nw:size, sw:size, se:size}, colors))
    this.action(function() {
        self.pane.palette.action = function(hex, x, y, piece, center) {
            var invDir = inverseDirection(piece);
            var invHex = hex[piece];
            if (center) {
                if (getSide(hex, "c", type)) {
                    removeSide(hex, "c", type);
                    for (var d in ALL_DIRECTIONS) {
                        addSide(hex, ALL_DIRECTIONS[d], type, size, colors, false);
                    }
                }
                else {
                    setSide(hex, "c", type, size, colors);
                    for (var d in ALL_DIRECTIONS) {
                        hex[ALL_DIRECTIONS[d]] && addSide(hex[ALL_DIRECTIONS[d]], inverseDirection(ALL_DIRECTIONS[d]),
                            type, size, colors, true);
                    }
                }
            }
            else {
                if (getSide(hex, piece, type)) {
                    removeSide(hex, piece, type);
                    invHex && removeSide(invHex, invDir, type);
                }
                else {
                    addSide(hex, piece, type, size, colors, true);
                    invHex && addSide(invHex, invDir, type, size, colors, true);
                }
            }

            function getSide(hex, direction, type) {
                var border = hex.getBorder(type);
                return border ? border.getSide(direction) : null;
            }
            function addSide(hex, direction, type, value, colors, force) {
                var border = hex.getBorder(type);
                if (border) {
                    if (!border.getSide(direction) && !border.getSide("c") || force) {
                        border.addSide(direction, value);
                    }
                }
                else {
                    border = new Border(type, {}, colors);
                    hex.setBorder(border);
                    border.addSide(direction, value);
                }
            }
            function setSide(hex, direction, type, value, colors) {
                var border = hex.getBorder(type);
                if (border) {
                    hex.removeBorder(type);
                }
                border = new Border(type, {}, colors);
                hex.setBorder(border);
                border.addSide(direction, value);
            }
            function removeSide(hex, direction, type) {
                var border = hex.getBorder(type);
                if (border) {
                    border.removeSide(direction);
                    if (isEmpty(border.getSides())) {
                        hex.removeBorder(type);
                    }
                }
            }
        }
    });
};
HexSupport.prototype.installDnD = function(item, doRotate, doDrop, doMove, doClick) {
    item.addEvent('mousedown', function(event) {
        var delta = item.hex.component.localPoint(event.x, event.y);
        var local = item.glass.localPoint(event.x, event.y);
        if (item.anchor(local.x, local.y)) {
            var angle = Math.round(Math.atan2(delta.x - item.x, -delta.y + item.y) / Math.PI * 180);
        }
        var initX = item.x;
        var initY = item.y;
        var initAngle = item.angle;
        var click = true;
        item.addEvent('mousemove', function(moveEvent) {
            var depl = item.hex.component.localPoint(moveEvent.x, moveEvent.y);
            if (angle) {
                var newAngle = Math.round(Math.atan2(depl.x-item.x, -depl.y+item.y)/Math.PI*180);
                item.rotate(initAngle+newAngle-angle);
            }
            else {
                item.move(initX + depl.x - delta.x, initY + depl.y - delta.y);
            }
            click = false;
        });
        item.addEvent('mouseup',function(endEvent) {
            if (click && endEvent.x===event.x && endEvent.y===event.y) {
                doClick(item)
            }
            else {
                var depl = item.hex.component.localPoint(endEvent.x, endEvent.y);
                if (angle) {
                    var newAngle = Math.round(Math.atan2(depl.x - item.x, -depl.y + item.y) / Math.PI * 180);
                    doRotate(item, initAngle + newAngle - angle);
                }
                else {
                    var finalX = Math.round(initX + depl.x - delta.x);
                    var finalY = Math.round(initY + depl.y - delta.y);
                    var global = item.hex.component.globalPoint(finalX, finalY);
                    var onMap = item.hex.map.component.localPoint(global);
                    var newHex = item.hex.map.getHexFromPoint(onMap);
                    if (newHex === item.hex) {
                        doMove(item, finalX, finalY);
                    }
                    else {
                        item.hex.removeItem(item);
                        if (newHex) {
                            var local = newHex.component.localPoint(global);
                            doMove(item, Math.round(local.x), Math.round(local.y));
                            doDrop(newHex, item);
                        }
                    }
                }
            }
            item.removeEvent('mousemove');
            item.removeEvent('mouseup');
        });
    });
};
HexSupport.prototype.enableDnD = function(item) {
    this.installDnD(item,
        function(item, angle) {item.rotate(Math.round(angle/15)*15);},
        function(hex, item) {hex.putItem(item);},
        function(item, x, y) {item.move(x, y);},
        function(item) {item.hex.removeItem(item);}
    );
};
HexSupport.prototype.disableDnD = function(item) {
    item.removeEvent('mousedown');
};
HexSupport.prototype.enableCompositeDnD = function(composite) {
    var hexComposite = this.hex.getItem(Composite);
    this.installDnD(composite,
        function(comp, angle) {
            comp.rotate(Math.round(angle/60)*60);
            comp.conform();
        },
        function(hex, comp) {
            var present = hex.getItem(Composite);
            if (present) {
                hex.removeItem(present);
            }
            hex.putItem(comp);
        },
        function(comp, x, y) {
            comp.move(0, 0);
        },
        function(comp) {
            if (!hexComposite.isHighlighted()) {
                hexComposite.clear();
                hexComposite.copy(comp.children);
                hexComposite.highlight(true);
            }
            else {
                comp.hex.removeItem(comp);
                /*
                comp.clear();
                comp.copy(hexComposite.children);
                */
            }
        }
    );

};
HexSupport.prototype.commonItem = function(itemForTool, itemForMap) {
    var self = this;
    this.hex.putItem(itemForTool(), 0, 0);
    this.action(function() {
        self.pane.palette.action = function(hex, x, y, piece, center) {
            var item = itemForMap();
            hex.putItem(item, Math.round(x), Math.round(y));
            self.enableDnD(item);
        };
    });
};
HexSupport.prototype.composite = function() {
    var me = this;
    me.hex.putItem(new Composite(0, HEX_WIDTH).highlight(true), 0, 0);
    me.action(
        function(selected) {
            var self = this;
            var composite = self.hex.getItem(Composite);
            if (!selected) {
                composite.highlight(!composite.isHighlighted())
            }
            me.pane.palette.action = function(hex, x, y, piece, center) {
                if (composite.isHighlighted()) {
                    var comp = composite.duplicate().highlight(true);
                    me.enableCompositeDnD(comp);
                    hex.putItem(comp, 0, 0);
                }
                else {
                    composite.clear();
                }
            };
        })
    .whenSelect(function(){
        var self = this;
        map.execute(function(hex) {
            if (hex.items.length!==0) {
                var composite = new Composite(0, HEX_WIDTH).highlight(true);
                self.enableCompositeDnD(composite);
                var items = hex.items.slice(0);
                for (var i = 0; i < items.length; i++) {
                    hex.removeItem(items[i]);
                    self.disableDnD(items[i]);
                    composite.add(items[i]);
                }
                hex.putItem(composite, 0, 0);
            }
        });
    })
    .whenUnselect(function() {
        var self=this;
        map.execute(function(hex) {
            var composite = hex.getItem(Composite);
            if (composite && composite.children.length!==0) {
                var items = composite.children.slice(0);
                for (var i = 0; i < items.length; i++) {
                    composite.remove(items[i]);
                    self.enableDnD(items[i]);
                    hex.putItem(items[i]);
                }
            }
            hex.removeItem(composite);
        });
    });

};

/*
var result = svg.request("/rest", {name:"Dupont", age:7})
    .onSuccess(function(){console.log(result.name)})
    .onFailure(function(code){console.log("Ko:"+code)});
*/

var map = new Map(31, 31, HEX_WIDTH, ["a", "b", "c", "d"], [180, 240, 180]).addGlasses(function(hex, x, y, piece, center) {
    palette.action(hex, x, y, piece, center);
});

var drawing = new gui.Canvas(1500, 1200)
    .show("content")
    .add(new gui.Frame(1000, 1000).set(map.component).position(510, 510).component);
var paneSaveLoad = new gui.Pane([[255, 230, 150], 4, [10, 10, 10]], "Save/load", 120);
var paneTerrain = new gui.Pane([[235, 230, 150], 4, [10, 10, 10]], "Terrain", 120);
var panePath = new gui.Pane([[215, 230, 150], 4, [10, 10, 10]], "Path", 120);
var paneBuilding = new gui.Pane([[195, 230, 150], 4, [10, 10, 10]], "Building", 120);
var palette = new gui.Palette(400, 1000).position(1230, 510)
    .addPane(paneSaveLoad)
    .addPane(paneTerrain)
    .addPane(panePath)
    .addPane(paneBuilding);

new HexSupport(new Hex(0, 0, HEX_WIDTH), paneTerrain).surface("a", [[80, 180, 80], 4, [60, 140, 60]]);
new HexSupport(new Hex(0, 0, HEX_WIDTH), paneTerrain).surface("b", [[80, 80, 180], 4, [60, 60, 140]]);
new HexSupport(new Hex(0, 0, HEX_WIDTH), panePath).line("c", 0.2, [[180, 180, 180], 4, [120, 120, 120]]);
new HexSupport(new Hex(0, 0, HEX_WIDTH), panePath).line("c", 0.3, [[180, 180, 180], 4, [120, 120, 120]]);
new HexSupport(new Hex(0, 0, HEX_WIDTH), panePath).border("d", 0.6, [[120, 120, 230], 4, [90, 90, 150]]);
new HexSupport(new Hex(0, 0, HEX_WIDTH), paneBuilding).commonItem(
    function() {return new House(30, 20, [[180, 80, 80], 2, [140, 60, 60]], 30);},
    function() {return new House(30, 20, [[180, 80, 80], 2, [140, 60, 60]], 0);});
new HexSupport(new Hex(0, 0, HEX_WIDTH), paneBuilding).commonItem(
    function() {return new RoundOpenTower(15, [[180, 180, 180], 2, [40, 40, 40]]);},
    function() {return new RoundOpenTower(15, [[180, 180, 180], 2, [40, 40, 40]]);});
new HexSupport(new Hex(0, 0, HEX_WIDTH), paneBuilding).commonItem(
    function() {return new SquareOpenTower(30, 30, [[180, 180, 180], 2, [40, 40, 40]], 15);},
    function() {return new SquareOpenTower(30, 30, [[180, 180, 180], 2, [40, 40, 40]], 0);});
new HexSupport(new Hex(0, 0, HEX_WIDTH), paneBuilding).commonItem(
    function() {return new Bridge(40, 14, [[200, 200, 200], 2, [40, 40, 40]], 0);},
    function() {return new Bridge(40, 14, [[200, 200, 200], 2, [40, 40, 40]], 0);});
new HexSupport(new Hex(0, 0, HEX_WIDTH), paneBuilding).composite();

var hexHouse = new Hex(0, 0, HEX_WIDTH);
new HexSupport(hexHouse, paneBuilding).action(
    function() {
        palette.action = function(hex, x, y, piece, center) {
        };
    });

drawing.add(palette.component);

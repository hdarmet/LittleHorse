/**
 * Created by HDA3014 on 18/01/2016.
 */
var svg = SVG();

function Canvas(id, width, height) {
    var that = this;
    this.zoomFactor = 1;
    this.width=width;
    this.height=height;
    this.component = new svg.Drawing(this.width, this.height).show(id);
    this.scaling = new svg.Scaling(1);
    this.lines = new svg.Translation();
    this.features = new svg.Translation();
    this.scaling.add(this.lines);
    this.scaling.add(this.features);
    this.component.add(this.scaling);

    function Feature(text) {
        this.text = text;
        this.x = 0;
        this.y = 0;
    }
    Feature.prototype.set = function(x, y) {
        this.x = x;
        this.y = y;
        this.component.move(this.x, this.y);
        if (this.parent) {
            this.parent.setLine(this);
        }
        return this;
    };
    Feature.prototype.move = function(x, y) {
        this.x = x;
        this.y = y;
        this.component.steppy(5, 100).onChannel().moveTo(this.x, this.y);
        if (this.parent) {
            this.parent.updateLine(this);
        }
        return this;
    };
    Feature.prototype.onClick = function(handler) {
        var self=this;
        this.component.onClick(function() {handler(self);});
        return this;
    };
    Feature.prototype.remove = function() {
        if (this.parent) {
            if (this.parent.left===this) {
                that.lines.remove(this.parent.leftLine);
                this.parent.leftLine = null;
                this.parent.left = null;
            }
            else if (this.parent.right===this) {
                that.lines.remove(this.parent.rightLine);
                this.parent.rightLine = null;
                this.parent.right = null;
            }
        }
        that.features.remove(this.component);
    };
    Feature.prototype.replace = function(feature) {
        var left = this.parent && this.parent.left===this;
        var right = this.parent && this.parent.right===this;
        this.remove();
        if (this.parent) {
            if (left) {
                this.parent.addLeft(feature);
            }
            else if (right) {
                this.parent.addRight(feature);
            }
        }
        return this;
    };

    this.Node = function(text) {
        Feature.call(this, text);
        this.component = new svg.Translation()
            .add(new svg.Rect(150, 50).color([100, 100, 255], 4, [50, 50, 200]).corners(10, 10).clickable())
            .add(new svg.Text(text).font("Arial", 18).position(0, 5).color([255, 255, 255]).clickable());
        that.features.add(this.component);
    };
    this.Node.prototype.__proto__=Feature.prototype;
    this.Node.prototype.addLeft = function(left) {
        this.left = left;
        left.parent = this;
        this.leftLine = new Line(this, left);
        that.lines.add(this.leftLine);
        return this;
    };
    this.Node.prototype.addRight = function(right) {
        this.right = right;
        right.parent = this;
        this.rightLine = new Line(this, right);
        that.lines.add(this.rightLine);
        return this;
    };
    this.Node.prototype.add = function(left, right) {
        this.addLeft(left);
        this.addRight(right);
        return this;
    };
    this.Node.prototype.updateLine = function(feature) {
        if (feature===this.left) {
            this.leftLine.steppy(5, 100).onChannel().endTo(feature.x, feature.y);
        }
        else if (feature===this.right) {
            this.rightLine.steppy(5, 100).onChannel().endTo(feature.x, feature.y);
        }
    };
    this.Node.prototype.setLine = function(feature) {
        if (feature===this.left) {
            this.leftLine.end(feature.x, feature.y);
        }
        else if (feature===this.right) {
            this.rightLine.end(feature.x, feature.y);
        }
    };
    this.Node.prototype.move = function(x, y) {
        Feature.prototype.move.call(this, x, y);
        if (this.leftLine) {
            this.leftLine.steppy(5, 100).onChannel().startTo(this.x, this.y);
        }
        if (this.rightLine) {
            this.rightLine.steppy(5, 100).onChannel().startTo(this.x, this.y);
        }
        return this;
    };
    this.Node.prototype.set = function(x, y) {
        Feature.prototype.set.call(this, x, y);
        if (this.leftLine) {
            this.leftLine.start(this.x, this.y);
        }
        if (this.rightLine) {
            this.rightLine.start(this.x, this.y);
        }
        return this;
    };
    this.Node.prototype.remove = function() {
        Feature.prototype.remove.call(this);
        this.left.remove();
        this.right.remove();
        return this;
    };
    function Line(start, end) {
        return new svg.Line(start.x, start.y, end.x, end.y).color([], 6, [100, 200, 100])
    }

    this.Leaf = function(text) {
        Feature.call(this, text);
        this.component = new svg.Translation()
            .add(new svg.Ellipse(75, 25).color([200, 200, 200], 4, [100, 100, 100]).clickable())
            .add(new svg.Text(text).font("Arial", 18).position(0, 5).color([0, 0, 0]).clickable());
        that.features.add(this.component);
    };
    this.Leaf.prototype.__proto__=Feature.prototype;
    this.Leaf.prototype.remove = function() {
        Feature.prototype.remove.call(this);
        return this;
    };
}

Canvas.prototype.dimension = function(width, height) {
    this.width = width;
    this.height = height;
    this.component.steppy(5, 100).onChannel().resizeTo(this.width, this.height);
};
Canvas.prototype.view = function(autofit, width, height) {
    this.viewWidth = width||this.viewWidth;
    this.viewHeight = height||this.viewHeight;
    if (autofit) {
        var widthRatio = this.width/this.viewWidth;
        var heightRatio = this.height/this.viewHeight;
        this.zoomFactor = 1;
        if (widthRatio<this.zoomFactor) {
            this.zoomFactor = widthRatio;
        }
        if (heightRatio<this.zoomFactor) {
            this.zoomFactor = heightRatio;
        }
    }
    else {
        this.dimension(this.viewWidth*this.zoomFactor, this.viewHeight*this.zoomFactor);
    }
    this.scaling.onChannel().steppy(5, 100).scaleTo(this.zoomFactor);
    return this;
};
Canvas.prototype.zoom = function(factor) {
    if (factor>=1) {
        this.zoomFactor = 1;
    }
    else {
        this.zoomFactor = factor;
    }
    this.view();
    return this;
};
Canvas.prototype.zoomIn = function() {
    var actual = Math.round(2/this.zoomFactor);
    this.zoom(2/(actual+1));
};
Canvas.prototype.zoomOut = function() {
    var actual = Math.round(2/this.zoomFactor);
    this.zoom(2/(actual-1));
};
Canvas.prototype.dno = function(feature) {
    Canvas.WIDTH = 200;
    Canvas.HEIGHT = 100;
    Canvas.BASEX = 100;
    Canvas.BASEY = 100;
    var locations = [];
    prepare(feature, 0);
    while(!process());
    var maxPosition = locate(feature, 0);
    this.view(true, maxPosition+Canvas.WIDTH, locations.length*Canvas.HEIGHT+Canvas.BASEY);

    function process() {
        var finished = true;
        for (var r=locations.length-1; r>=0; r--) {
            for (var c=0; c<locations[r].length; c++) {
                finished &= adjust(r, c);
            }
        }
        return finished;
    }

    function adjust(row, column) {
        var finished = true;
        var location = locations[row][column];
        if (location.feature.left) {
            var position = (location.feature.left.location.position+location.feature.right.location.position)/2;
            if (location.position<position) {
                location.position = position;
                console.log(location.feature.text+" middle "+location.position);
                moveRow(row, column + 1, position + Canvas.WIDTH);
                finished = false;
            }
        }
        if (location.feature.parent && location.feature.parent.left===location.feature) {
            var position = location.feature.parent.location.position;
            if (location.position<position-Canvas.WIDTH/2 && !inMiddle(location.feature.parent)) {
                location.position = position-Canvas.WIDTH/2;
                console.log(location.feature.text+" parent "+location.position);
                moveRow(row, column + 1, position+Canvas.WIDTH/2);
                finished = false;
            }
        }
        console.log("Ajust "+location.feature.text);
        return finished;

        function inMiddle(feature) {
            var childrenMiddle = (feature.left.location.position+feature.right.location.position)/2;
            return feature.location.position <= childrenMiddle;
        }
    }

    function moveRow(row, column, position) {
        if (column<locations[row].length) {
            var location = locations[row][column];
            if (location.position < position) {
                console.log(location.feature.text+" move "+position);
                location.position = position;
                moveRow(row, column + 1, position + Canvas.WIDTH);
            }
        }

    }

    function prepare(feature, index) {
        var row = locations[index];
        if (!row) {
            row=[];
            locations[index]=row;
        }
        feature.location = {feature:feature, position:(row.length*Canvas.WIDTH)};
        row.push(feature.location);
        if (feature.left) {
            prepare(feature.left, index+1);
        }
        if (feature.right) {
            prepare(feature.right, index+1);
        }
    }

    function locate(feature, index) {
        var position = feature.location.position+Canvas.BASEX;
        var leftPosition = 0;
        var rightPosition = 0;
        feature.move(position, index*Canvas.HEIGHT+Canvas.BASEY);
        if (feature.left) {
            leftPosition = locate(feature.left, index+1);
        }
        if (feature.right) {
            rightPosition = locate(feature.right, index+1);
        }
        if (leftPosition>position) {
            position = leftPosition;
        }
        if (rightPosition>position) {
            position = rightPosition;
        }
        return position;
    }
};

// tests
var nodeCounter = 10;
var leafCounter = 10;

var canvas = new Canvas("content", 600, 400);
var root = new canvas.Leaf("Leaf").onClick(replaceLeaf);

function replaceNode(node) {
    var feature = new canvas.Leaf("Leaf "+leafCounter++).onClick(replaceLeaf);
    feature.set(node.x, node.y);
    feature.component.onChannel().steppy(5, 100).opacity(0, 1);
    node.replace(feature);
    if (node===root) {
        root = feature;
    }
    else {
        feature.parent.leftLine.onChannel().steppy(5, 100).opacity(0, 1);
        feature.parent.rightLine.onChannel().steppy(5, 100).opacity(0, 1);
    }
    canvas.dno(root);
}

function replaceLeaf(leaf) {
    var leaf1 = new canvas.Leaf("Leaf "+leafCounter++).onClick(replaceLeaf);
    var leaf2 = new canvas.Leaf("Leaf "+leafCounter++).onClick(replaceLeaf);
    var feature = new canvas.Node("DRAM"+nodeCounter++).onClick(replaceNode)
        .add(
            leaf1,
            leaf2
        );
    leaf1.component.onChannel().steppy(5, 100).opacity(0, 1);
    leaf2.component.onChannel().steppy(5, 100).opacity(0, 1);
    feature.component.onChannel().steppy(5, 100).opacity(0, 1);
    feature.leftLine.onChannel().steppy(5, 100).opacity(0, 1);
    feature.rightLine.onChannel().steppy(5, 100).opacity(0, 1);
    feature.set(leaf.x, leaf.y);
    leaf1.set(leaf.x-Canvas.WIDTH/2, leaf.y+Canvas.HEIGHT);
    leaf2.set(leaf.x+Canvas.WIDTH/2, leaf.y+Canvas.HEIGHT);
    leaf.replace(feature);
    if (leaf===root) {
        root = feature;
    }
    else {
        feature.parent.leftLine.onChannel().steppy(5, 100).opacity(0, 1);
        feature.parent.rightLine.onChannel().steppy(5, 100).opacity(0, 1);
    }
    canvas.dno(root);
}

canvas.dno(root);

var PLUS = 107;
var MINUS = 109;

(function () {
    var frozed = false;
    window.onkeydown = function (event) {
        if (!frozed) {
            if (event.keyCode === PLUS) {
                canvas.zoomIn();
                frozed = true;
                setTimeout(function() {frozed=false;}, 500);
            }
            else if (event.keyCode === MINUS) {
                canvas.zoomOut();
                frozed = true;
                setTimeout(function() {frozed=false;}, 500);
            }
        }
    };
})();


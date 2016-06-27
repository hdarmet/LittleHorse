/**
 * Created by HDA3014 on 11/03/2016.
 */
let assert = require('assert');
let testUtils = require('./testutils');
let mockRuntime = require('../runtimemock').mockRuntime;
let SVG = require('../svghandler').SVG;

let mapEditor = require("../uscw/mapeditor").mapEditor;

let runtime;
let svg;

let retrieve = testUtils.retrieve;

describe('Map editor', function() {

    beforeEach(function () {
        runtime = mockRuntime();
        runtime.declareAnchor('content');
        svg = SVG(runtime);
    });

    it("opens map editor", function (done) {
        let editor = mapEditor(svg);
        editor.show("content");
        let background = retrieve(editor.component.component, "[background]");
        done();
    });
});
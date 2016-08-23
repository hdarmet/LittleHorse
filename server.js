/**
 * Created by HDA3014 on 28/01/2016.
 */
var express = require('express');
var bodyParser = require("body-parser");
var path = require('path');
var fs = require('fs');
var app = express();

app.use(express.static(__dirname));
app.use(bodyParser.json());

fs.writeFileSync("./log/data.json", "");
var line=0;

app.post('/rest', function(req, res) {
    for(var k in req.body) {
        console.log("received : "+k);
    };
    res.send(JSON.stringify({name:"Dupont"}));
});

app.post('/log', function(req, res) {
    fs.appendFileSync("./log/data.json", JSON.stringify(req.body)+"\n");
    res.send({ack:'ok'});
});

const GAMES_URL = "./uscw/games/";
const PLAYS_URL = "./uscw/plays/";
const MODEL_URL = "./modeler/save/";

function save(url, req, res) {
    let fileName = url + req.body.file + ".json";
    fs.stat(fileName, function(err, stat) {
        if(err == null) {
            res.send({ack:'ko', err:"file exists."});
            console.log('File exists');
        } else if(err.code == 'ENOENT') {
            fs.writeFile(fileName, JSON.stringify(req.body.data) + "\n",
                (err)=>{
                    if (err) {
                        res.send({ack:'ko', err:err});
                    }
                    else {
                        res.send({ack:'ok'});
                    }
                });
        } else {
            console.log('Some other error: ', err.code);
            res.send({ack:'ko', err:err});
        }
    });
}

function replace(url, req, res) {
    let fileName = url + req.body.file + ".json";
    fs.writeFile(fileName, JSON.stringify(req.body.data) + "\n",
        (err)=>{
            if (err) {
                res.send({ack:'ko', err:err});
            }
            else {
                res.send({ack:'ok'});
            }
        });
}

function list(url, req, res) {
    var files = fs.readdir(url,
        (err, files)=> {
            if (err) {
                res.send({ack: 'ko', err: err});
            }
            else {
                res.send({
                    ack: 'ok', files: files.map(file=> {
                        return {name: file.slice(0, -5)}
                    })
                });
            }
        });
}

function load(url, req, res) {
    let fileName = url + req.body.file + ".json";
    fs.readFile(fileName,
        (err, data)=>{
            if (err) {
                res.send({ack:'ko', err:err});
            }
            else {
                res.send({ack:'ok', data:data.toString()});
            }
        });
}

function remove(url, req, res) {
    let fileName = url + req.body.file + ".json";
    fs.unlink(fileName,
        (err)=>{
            if (err) {
                res.send({ack:'ko', err:err});
            }
            else {
                res.send({ack:'ok'});
            }
        });
}

app.post('/uscw/edit', function(req, res) {
    if (req.body.method==='save') {
        save(GAMES_URL, req, res);
    }
    else if (req.body.method==='replace') {
        replace(GAMES_URL, req, res);
    }
    else if (req.body.method==='list') {
        list(GAMES_URL, req, res);
    }
    else if (req.body.method==='load') {
        load(GAMES_URL, req, res);
    }
    else if (req.body.method==='remove') {
        remove(GAMES_URL, req, res);
    }
    else {
        res.send({ack: 'ko', err: 'unknown method'});
    }
});

app.post('/uscw/play', function(req, res) {
    if (req.body.method==='save') {
        save(PLAYS_URL, req, res);
    }
    else if (req.body.method==='replace') {
        replace(PLAYS_URL, req, res);
    }
    else if (req.body.method==='list') {
        list(PLAYS_URL, req, res);
    }
    else if (req.body.method==='load') {
        load(PLAYS_URL, req, res);
    }
    else if (req.body.method==='remove') {
        remove(PLAYS_URL, req, res);
    }
    else if (req.body.method==='listgames') {
        list(GAMES_URL, req, res);
    }
    else if (req.body.method==='loadgame') {
        load(GAMES_URL, req, res);
    }
    else {
        res.send({ack: 'ko', err: 'unknown method'});
    }
});

app.post('/model/edit', function(req, res) {
    if (req.body.method==='save') {
        save(MODEL_URL, req, res);
    }
    else if (req.body.method==='replace') {
        replace(MODEL_URL, req, res);
    }
    else if (req.body.method==='list') {
        list(MODEL_URL, req, res);
    }
    else if (req.body.method==='load') {
        load(MODEL_URL, req, res);
    }
    else if (req.body.method==='remove') {
        remove(MODEL_URL, req, res);
    }
    else {
        res.send({ack: 'ko', err: 'unknown method'});
    }
});

app.listen(3000);
var express = require('express');
var app = express();
var request = require('request');
var bodyParser = require('body-parser');
var spreadsheetsHelper = require('./googleSpreadsheetsHelper');
var fileSystemHelper = require('./fileSystemHelper');
var auth = require('./googleAuth');
var dbHelper = require('./dbHelper');

var staticDir = __dirname + '/public';

app.set('db-uri', 'mongodb://localhost:27017/localisation');
app.use(express.static(staticDir));
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// app.set('view options', {
// 	pretty: true
// });
dbHelper.initialize(app.get('db-uri'));


function checkToken(req, res, next) {
	if(auth.getToken()) {
		next();
	} else {
		res.redirect('/login');
	}
} 

app.get('/', checkToken, function(req, res) {
	res.sendFile(staticDir + '/index2.html');
});

app.get('/login', function(req, res) {
	var url = auth.generateAuthLink(req);
	res.redirect(url);
});

app.get('/post', function(req, res) {
	spreadsheetsHelper.addNewCell(null, null, function() {
		res.json('ok');
	});
});

app.get('/history', function(req, res) {
	var item = req.query.item;
	dbHelper.getLocalisationHistory(item, function(result) {
		res.json(result);
	});
});

app.get('/latest', function(req, res) {
	dbHelper.getLatestLocalisation(function(result) {
		res.json(result);
	});
});

app.get('/code', function(req, res) {
	auth.requestToken(req, function(token) {
		if(token) {
			res.redirect('/');
		} else {
			res.redirect('/login');
		}
	});
});

app.get('/worksheets', function(req, res) {
	var key = req.query.key;
	spreadsheetsHelper.getWorksheetsData(key, function(err, worksheets) {
		res.json(worksheets);
	});
});

app.get('/worksheet', function(req, res) {
	var url = req.query.url;
	spreadsheetsHelper.getWorksheetJson(url, function(err, result) {
		res.json(result);
	});
});

app.post('/update', function(req, res) {
	var item = req.body.item;
	spreadsheetsHelper.updateCell(item, function(result) {
		res.json(result);
	});
});

app.get('/generate', checkToken, function(req, res) {
	var key = req.query.key;
	spreadsheetsHelper.getSpreadsheetJson(key, function(err, localisation) {
		dbHelper.insertLocalisation(localisation);
		fileSystemHelper.generateJsonFiles(localisation, function() {
			res.json(localisation);
		});		
	});
});

app.listen(3000);
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

app.get('/code', function(req, res) {
	auth.requestToken(req, function(token) {
		if(token) {
			res.redirect('/');
		} else {
			res.redirect('/login');
		}
	});
});

app.get('/login', function(req, res) {
	var url = auth.generateAuthLink(req);
	res.redirect(url);
});

app.get('/localisation', function(req, res) {
	var url = req.query.url;
	spreadsheetsHelper.getWorksheetData(url, function(err, result) {
		if(result.status === 'error') {
			res.json({error: err})
		} else {
			res.json(result);
		}
	});
});

app.put('/localisation', function(req, res) {
	var item = req.body.item;
	spreadsheetsHelper.updateLocalisation(item, function(err, result) {
		if(result.status === 'error') {
			res.json({error: err})
		} else {
			res.json(result);
		}
	});
});

app.post('/localisation', function(req, res) {
	var item = req.body.item;
	var key = req.body.key;
	spreadsheetsHelper.addNewLocalisation(key, item, function(err, result) {
		if(result.status === 'error') {
			res.json({error: err})
		} else {
			res.json(result);
		}
	});
});

app.get('/zip', checkToken, function(req, res) {
	var key = req.query.key;
	spreadsheetsHelper.getSpreadsheetData(key, function(err, result) {
		if(result.status === 'error') {
			res.json('error');
		} else {		
			dbHelper.insertLocalisations(result.data);
			fileSystemHelper.generateJsonFiles(result.data, function() {
				res.download(__dirname + '/localisation.zip');
			});		
		}
	});
});

app.get('/history', function(req, res) {
	var item = req.query.item;
	dbHelper.getLocalisationHistory(item, function(err, result) {
		if(result.status === 'error') {
			res.json({error: err})
		} else {
			res.json(result);
		}
	});
});

app.get('/latest', function(req, res) {
	dbHelper.getLatestLocalisation(function(result) {
		res.json(result);
	});
});

app.get('/worksheets', function(req, res) {
	var key = req.query.key;
	spreadsheetsHelper.getWorksheetsInfo(key, function(err, result) {
		if(result.status === 'error') {
			res.json({error: err})
		} else {
			res.json(result);
		}
	});
});

app.listen(3000);
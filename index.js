var express = require('express');
var app = express();
var request = require('request');
var session = require('express-session');
var bodyParser = require('body-parser');
var spreadsheetsHelper = require('./googleSpreadsheetsHelper');
var fileSystemHelper = require('./fileSystemHelper');
var dbHelper = require('./dbHelper');
var auth = require('./authHelper');
var staticDir = __dirname + '/public';

app.set('db-uri', 'mongodb://localhost:27017/localisation');
app.use(express.static(staticDir));
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(session({secret: 'localisation secret'}))
app.set('views', staticDir);
app.set('view engine', 'jade');

dbHelper.initialize(app.get('db-uri'));

function checkAuth(req, res, next) {
	next();
} 

app.get('/', checkAuth, function(req, res) {
	res.render('index.jade');
});

// app.get('/admin', checkAuth, function(req, res) {
// 	var user = basicAuth(req);
// 	if(user && user.name === 'test' && user.pass === 'test') {
// 		var key = req.session.key;
// 		if(key) {
// 			res.render('admin.jade');
// 		} else {
// 			res.redirect('/');
// 		}
// 	} else {
// 		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
// 		return res.send(401).end();
// 	}
// });

app.get('/login', function(req, res) {
	var name = req.body.name;
	var password = req.body.password;
	auth.signIn({name: name, password: password}, function(err, isMatch) {
		if(isMatch) {
			req.session.auth = 
		}
	});
});

app.get('/logout', function(req, res) {
	req.session.auth = null;
	res.redirect('/login');
});

app.get('/localisation', function(req, res) {
	var url = req.query.url;
	spreadsheetsHelper.getWorksheetData(url, function(err, result) {
		if(result.status === 'error') {
			res.json({error: err});
		} else {
			res.json(result);
		}
	});
});

app.put('/localisation', function(req, res) {
	var item = req.body.item;
	spreadsheetsHelper.updateLocalisation(item, function(err, result) {
		if(result.status === 'error') {
			res.json({error: err});
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
			res.json({error: err});
		} else {
			res.json(result);
		}
	});
});

app.get('/zip', checkAuth, function(req, res) {
	var key = req.query.key;
	spreadsheetsHelper.getSpreadsheetData(key, function(err, result) {
		if(result.status === 'error') {
			res.json('error');
		} else {		
			dbHelper.insertLocalisations(result.data);
			fileSystemHelper.generateJsonFiles(result.data, function(path) {
				res.download(path);
			});		
		}
	});
});

app.get('/history', function(req, res) {
	var item = req.query.item;
	dbHelper.getLocalisationHistory(item, function(err, result) {
		if(result.status === 'error') {
			res.json({error: err});
		} else {
			res.json(result);
		}
	});
});

app.get('/diff', function(req, res) {
	try {
		var from = new Date(req.query.from);
		var to = new Date(req.query.to);
	} catch(e) {
		res.json(e);
		return;
	}
	var range = {from: from, to: to};
	dbHelper.getLocalisationDiff(range, function(err, result) {
		if(result.status === 'error') {
			res.json({error: err});
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
			res.json({error: err});
		} else {
			req.session.key = key;
			res.json(result);
		}
	});
});

app.listen(3000);
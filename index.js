var express = require('express');
var app = express();
var request = require('request');
var session = require('express-session');
var bodyParser = require('body-parser');
var spreadsheetsHelper = require('./googleSpreadsheetsHelper');
var fileSystemHelper = require('./fileSystemHelper');
var dbHelper = require('./dbHelper');
var auth = require('./authHelper');
var basicAuth = require('basic-auth');
var staticDir = __dirname + '/public';
var spreadsheetKey = '1LhZbstNbIyPyzwMSJyZyAmWPwtw0Uwg5aSPUaAu370s';

app.set('db-uri', 'mongodb://localhost:27017/localisation');
app.use(express.static(staticDir));
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(session({secret: 'localisation secret'}))
app.set('views', staticDir);
app.set('view engine', 'jade');

dbHelper.initialize(app.get('db-uri'));

(function decorateLog() {
	var originalLog = console.log;
	console.log = function(log) {
		var date = new Date();
		var text = '[' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '] ' + log;
		originalLog(text);
	}
})();

function checkAuth(req, res, next) {
	if(!req.session.auth) {
		return res.render('login.jade');
	}
	var user = req.session.auth;
	auth.checkUser(user, function(err, result) {
		if(err) {
			res.render('login.jade');		  
		} else {
			req.session.auth = result.data.user;
			next();
		}
	});
}

function isAdmin(req, res, next) {
	if(!req.session.auth || req.session.auth.role !== 'admin') {
		req.session.auth = null;
		res.render('login.jade', {error: 'You are not allowed to view this page. Login using another credentials.'});
	} else {
		next();
	}
}

app.get('/', checkAuth, function(req, res) {
	var user = req.session.auth;
	res.render('index.jade', {user: user, key: spreadsheetKey});
});

app.get('/accounts', isAdmin, function(req, res) {
	res.render('users.jade');
});

app.get('/user', function(req, res) {
	auth.getUsers(function(err, result) {
		if(!err) {
			res.json(result);
		} else {
			res.json({error: err});
		}
	});
});

app.post('/user', function(req, res) {
	var user = {
		name : req.body.name,
		pass : req.body.pass,
		role : req.body.role
	};
	auth.register(user, function(err) {
		if(!err) {
			res.json({status: 'ok'});
		} else {
			res.json({error: err});
		}
	});
});

app.put('/user', function(req, res) {
	var user = {
		name : req.body.name,
		pass : req.body.pass,
		role : req.body.role
	};
	auth.updateUser(user, function(err) {
		if(!err) {
			res.json({status: 'ok'});
		} else {
			res.json({error: err});
		}
	});
});

app.post('/login', function(req, res) {
	var user = {
		name : req.body.name,
		pass : req.body.pass
	};
	auth.signIn(user, function(err, result) {
		if(err) {
			res.render('login.jade', {error: err});			  
		} else {
			req.session.auth = result.data.user;
			res.redirect('/');
		}
	});
});

app.get('/logout', function(req, res) {
	req.session.auth = null;
	res.redirect('/');
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
	if(!item.key || !item.project || !item.originalValue) {
		return res.json({error: 'Check the translation\'s "original", "key" or "project" value.'});
	}
	spreadsheetsHelper.addNewLocalisation(spreadsheetKey, item, function(err, result) {
		if(result.status === 'error') {
			res.json({error: err});
		} else {
			res.json(result);
		}
	});
});

app.delete('/localisation', function(req, res) {
	var item = req.body.item;
	spreadsheetsHelper.deleteLocalisation(spreadsheetKey, item, function(err, result) {
		if(result.status === 'error') {
			res.json({error: err});
		} else {
			res.json(result);
		}
	});
});

app.get('/zip', checkAuth, function(req, res) {
	spreadsheetsHelper.getSpreadsheetData(spreadsheetKey, function(err, result) {
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

app.get('/authzip', function(req, res) {
	var user = basicAuth(req);
	if(!user) {
		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
		return res.status(401).end();		
	}
	auth.signIn(user, function(err, result) {
		if(err) {
			console.log('Error while special zip generation. Seems credentials are not valid.');
			res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
			return res.status(401).end();
		} else {
			spreadsheetsHelper.getSpreadsheetData(spreadsheetKey, function(err, result) {
				if(result.status === 'error') {
					console.log('Error while special zip generation. Error during generation.');
					res.json({error: result.error});
				} else {		
					dbHelper.insertLocalisations(result.data);
					fileSystemHelper.generateJsonFiles(result.data, function(path) {
						res.download(path);
					});
				}
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

app.post('/newkey', function(req, res) {
	var key = req.body.key;
	if(key) {
		spreadsheetKey = key;
		res.redirect('/');
	} else {
		res.json({error: 'New key is not valid'});
	}
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
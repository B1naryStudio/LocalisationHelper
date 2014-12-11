var dbHelper = require('../helpers/dbHelper');
var spreadsheetsHelper = require('../helpers/googleSpreadsheetsHelper');
var fileSystemHelper = require('../helpers/fileSystemHelper');
var auth = require('../helpers/authHelper');
var basicAuth = require('basic-auth');
var utils = require('../helpers/utils');

module.exports = function(app) {
	app.get('/zip', utils.checkAuth, function(req, res) {
		spreadsheetsHelper.getSpreadsheetData(utils.currentKey(), function(err, result) {
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
				res.json({error: err});
			} else {
				spreadsheetsHelper.getSpreadsheetData(utils.currentKey(), function(err, result) {
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

	app.get('/consistency', function(req, res) {
		spreadsheetsHelper.checkSpredsheetConsistent(utils.currentKey(), function(err, result) {
			if(result.status === 'error') {
				res.json({error: err});
			} else {
				res.json(result);
			}		
		});
	});
};
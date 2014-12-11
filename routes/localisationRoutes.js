var spreadsheetsHelper = require('../helpers/googleSpreadsheetsHelper');
var utils = require('../helpers/utils');

module.exports = function(app) {
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

	app.post('/localisation/multi', function(req, res) {
		var items = req.body.items;
		spreadsheetsHelper.multiUpdateLocalications(items, function(err, result) {
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
		spreadsheetsHelper.addNewLocalisation(utils.currentKey(), item, function(err, result) {
			if(result.status === 'error') {
				res.json({error: err});
			} else {
				res.json(result);
			}
		});
	});

	app.delete('/localisation', function(req, res) {
		var item = req.body.item;
		spreadsheetsHelper.deleteLocalisation(utils.currentKey(), item, function(err, result) {
			if(result.status === 'error') {
				res.json({error: err});
			} else {
				res.json(result);
			}
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
};
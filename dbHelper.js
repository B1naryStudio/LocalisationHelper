var mongo = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var _ = require('underscore');
var async = require('async');

function DbHelper() {};

DbHelper.prototype.initialize = function(uri) {
	var self = this;
	mongo.connect(uri, function(err, db) {
		if(err) {
			console.log('Can\'t connect to ' + url);
		} else {
			self.db = db;
		}
	});
};

DbHelper.prototype.insertLocalisations = function(records) {
	var localisation = this.db.collection('localisation');
	for(var lang in records) {
		async.each(records[lang], function(item, asyncCompleted) {
			item.createdAt = new Date();
			localisation.insert(item, function(err, docs) {
				if(err) {
					console.log('err');
				}
				asyncCompleted();
			});
		}, function(err) {
			if(err) {
				console.log(err);
			} else {
				console.log('Inserted localisation snapshot, lang:' + lang);
			}
		});
	}
};

DbHelper.prototype.insertLocalisation = function(item) {
	item.createdAt = new Date();
	this.db.collection('localisation').insert(item, function(err, docs) {
		console.log('wrote ' + JSON.stringify(item));
	});
};

DbHelper.prototype.logTranslationUpdate = function(localisation) {
	this.insertLocalisation(localisation);
	localisation.dateTime = new Date();
	localisation.type = "update";
	this.db.collection('diff').
		insert(localisation, function(err, docs) {
			if(!err) {
				console.log('Logged localisation "Update". Key: ' + 
					localisation.key + ', lang: ' + localisation.lang);
			} else {
				console.log('Can\'t log localisation "Update". Reason: ' + err);
			}
		});
};

DbHelper.prototype.logTranslationAdd = function(localisation) {
	this.insertLocalisation(localisation);
	localisation.dateTime = new Date();
	localisation.type = "add";
	this.db.collection('diff').
		insert(localisation, function(err, docs) {
			if(!err) {
				console.log('Logged localisation "Add". Key: ' + 
					localisation.key);
			} else {
				console.log('Can\'t log localisation "Add". Reason: ' + err);
			}
		});
};

DbHelper.prototype.getLocalisationDiff = function(range, callback) {
	this.db.collection('diff')
		.find({$and: [{createdAt: {$gte: range.from}}, {createdAt: {$lte: range.to}}]})
		.toArray(function(err, docs) {
			var result = {};
			if(err) {
				callback(err, {status: 'error'});
			} else {
				callback(null, {status: 'ok', data: docs});
			}
		});
};

DbHelper.prototype.getLocalisationHistory = function(localisation, callback) {
	this.db.collection('localisation')
		.find({lang: localisation.lang, key: localisation.key})
		.toArray(function(err, docs) {
			var result = {};
			if(err) {
				callback(err, {status: 'error'});
			} else {
				callback(null, {status: 'ok', data: docs});
			}
		});
};

DbHelper.prototype.getLatestLocalisation = function(callback) {
	var localisation = this.db.collection('localisation');
	callback();
};

module.exports = new DbHelper();
var mongo = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var _ = require('underscore');

function DbHelper() {

};

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

DbHelper.prototype.insertLocalisation = function(records) {
	var localisation = this.db.collection('localisation');
	for(var lang in records) {
		_.each(records[lang], function(item) {
			item.createdAt = new Date();
			localisation.insert(item, function(err, docs) {
				console.log('wrote ' + JSON.stringify(item));
			});
		});
	}
};

DbHelper.prototype.getLatestLocalisation = function(callback) {
	var localisation = this.db.collection('localisation');
	var result = localisation.group(
		{ lang: 1, key: 1 }, // keys
		{}, // condition
		{ items : [], item: {}}, //initial
		function (curr, result) { // reduce
			result.items.push(curr);
		},
		function(result) { // finalize
			result.item = result.items.sort(function(a, b) {
				return a.createdAt < b.createdAt;
			})[0]; // TODO refactor
			delete result.items;
		},
		true, // command
		{}, // options
		function(err, result) { // callback
			
			var localisations = {};
			_.each(result, function(item) {
				if(localisations[item.lang]) {
					localisations[item.lang].push(item.item);
				} else {
					localisations[item.lang] = [item.item];
				}
			});
			callback(localisations);
		}
	);

};

module.exports = new DbHelper();
var mongo = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var _ = require('underscore');
var async = require('async');
var moment = require('moment');

function DbHelper() {};

function formatDates(docs) {
	return _.map(docs, function(item) {
		if(item.createdAt) {
			item.createdAt = moment(item.createdAt).format('MMMM Do YYYY, h:mm:ss a');
		}
		if(item.dateTime) {
			item.dateTime = moment(item.dateTime).format('MMMM Do YYYY, h:mm:ss a');
		}
		return item;
	});
}

/**
 * Performs DB initialisation
 * @param  {String} uri DB uri to connect
 */
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

/**
 * Creates new user
 * @param  {Object}   user User's data 
 * @param  {Function} callback
 */
DbHelper.prototype.createUser = function(user, callback) {
	var self = this;
	this.getUser(user, function(err, existedUser) {
		if(existedUser) {
			return callback("The user with such name already exist.");			
		}
		self.db.collection('users').insert(user, function(err, docs) {
			if(!err) {
				callback(null, {status: 'ok'});
			} else {
				callback(err);
			}
		});
	});
};

/**
 * Get user's data
 * @param  {Object}   user Object with user name
 * @param  {Function} callback
 * @return {Object}
 */
DbHelper.prototype.getUser = function(user, callback) {
	this.db.collection('users').findOne({name: user.name}, function(err, user) {
		if(!err && user) {
			callback(null, user);
		} else {
			callback(err);
		}
	});
};

/**
 * Returns all users in the system
 * @param  {Function} callback
 * @return {Array} List of users
 */
DbHelper.prototype.getAllUsers = function(callback) {
	this.db.collection('users')
		.find({})
		.toArray(function(err, users) {
			if(err) {
				return callback(err, {status: 'error'});
			}
			callback(null, users);
		});
};

/**
 * Updates user's data
 * @param  {Object}   user User to be updated
 * @param  {Function} callback Callback
 * @return {Object}   Updated user
 */
DbHelper.prototype.updateUser = function(user, callback) {
	this.db.collection('users').update({name: user.name}, user, function(err, user) {
		if(!err && user) {
			callback(null, user);
		} else {
			callback(err);
		}
	});
};

/**
 * Inserts localisation records
 * @param  {Array} records Localisation records to be inserted
 */
DbHelper.prototype.insertLocalisations = function(records) {
	var localisation = this.db.collection('localisation');
	for(var lang in records) {
		async.each(records[lang], function(item, asyncCompleted) {
			item.createdAt = new Date();
			localisation.insert(item, function(err, docs) {
				if(err) {
					console.log('Error during insert localisations. Reason: ' + err);
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

/**
 * Allias for logTranslation for UPDATES
 * @param  {Object} localisation Localisation object
 */
DbHelper.prototype.logTranslationUpdate = function(localisation) {
	this.logTranslation(localisation, 'update');
};

/**
 * Allias for logTranslation for DELETES
 * @param  {Object} localisation Localisation object
 */
DbHelper.prototype.logTranslationDelete = function(localisation) {
	this.logTranslation(localisation, 'delete');
};

/**
 * Allias for logTranslation for INSERTS
 * @param  {Object} localisation Localisation object
 */
DbHelper.prototype.logTranslationAdd = function(localisation) {
	this.logTranslation(localisation, 'add');
};


/**
 * Log localisation actions to the DB
 * @param  {Object} localisation Localisation object
 * @param  {String} type Type of log
 */
DbHelper.prototype.logTranslation = function(localisation, type) {
	localisation.dateTime = new Date();
	localisation.type = type;
	this.db.collection('diff').
		insert(localisation, function(err, docs) {
			if(!err) {
				console.log('Logged localisation "' + type.toUpperCase() + '". Key: ' + 
					localisation.key);
			} else {
				console.log('Can\'t log localisation "' + type.toUpperCase() + '". Reason: ' + err);
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
				callback(null, {status: 'ok', data: formatDates(docs)});
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
				callback(null, {status: 'ok', data: formatDates(docs)});
			}
		});
};

DbHelper.prototype.getLatestLocalisation = function(callback) {
	var localisation = this.db.collection('localisation');
	callback();
};

module.exports = new DbHelper();
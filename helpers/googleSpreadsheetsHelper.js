var request = require('google-oauth-jwt').requestWithJWT();
var _ = require('underscore');
var async = require('async');
var dbHelper = require('./dbHelper');
var XML = require("node-jsxml").XML;

var jwt = {
	email: '551651064595-5i2ca0ck9bnh7v02qddn92frgi8g8gr9@developer.gserviceaccount.com',
	keyFile: 'private-key.pem',
	scopes: ['https://spreadsheets.google.com/feeds']
};

function GoogleSpreadsheetsHelper() {
	this.root = 'https://spreadsheets.google.com/feeds';
	this.listFeedRel = 'http://schemas.google.com/spreadsheets/2006#listfeed';
};

function parseLocalisationList(entries, lang) {
	var result = [];
	_.each(entries, function(item) {
		result.push({
			id: item.id.$t,
			lang: lang,
			context: item.gsx$context.$t,
			project: item.gsx$project.$t,
			originalValue: item.gsx$originalvalue.$t,
			key: item.gsx$key.$t,
			translation: item.gsx$translation.$t,
			editLink: _.findWhere(item.link, {rel: 'edit'}).href
		});
	});
	return result;
};

/**
 * Updates existing localisation key
 * @param  {Object}   item Localisation Item
 * @param  {Function} callback
 */
GoogleSpreadsheetsHelper.prototype.updateLocalisation = function(item, callback) {
	var data = '<entry xmlns="http://www.w3.org/2005/Atom" ' +
					'xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">' +
					'<id>' + item.id + '</id>' +
					'<gsx:context>' + item.context + '</gsx:context>' +
					'<gsx:key>' + item.key + '</gsx:key>' +
					'<gsx:originalvalue>' + item.originalValue + '</gsx:originalvalue>' +
					'<gsx:project>' + item.project + '</gsx:project>' +
					'<gsx:translation>' + item.translation + '</gsx:translation>' +
				'</entry>';
	var url = item.editLink;
	request.put({url: url, jwt: jwt, headers: {'Content-Type' : 'application/atom+xml'}, body: data}, function(err, httpResponse, body) {
		if(err) {
			return callback(err, {status: 'error'});
		} else if(body.indexOf(item.translation) > -1) {
			dbHelper.logTranslationUpdate(item);
			var newItem = new XML(body);
			var newEditLink = newItem.child('link').item(1).attribute('href').getValue()
			return callback(null, {status: 'ok', data: {editLink: newEditLink}});
		} else {
			return callback('Smth wrong during google API request.', {status: 'error'});
		}
	});
};

GoogleSpreadsheetsHelper.prototype.multiUpdateLocalications = function(items, callback) {
	var self = this;
	async.each(items, function(item, asyncCallback) {
		self.updateLocalisation(item, asyncCallback);
	}, function(err) {
		if(err) {
			console.log(err);
			return callback(err, {status: 'error'});
		} 
		return callback(null, {status: 'ok'});
	});
};

/**
 * Adds new localisation key to each lang (worksheet) in spreadsheet
 * @param {String}   spreadsheetKey Spreadsheet Key
 * @param {Object}   item Localisation Item
 * @param {Function} callback
 */
GoogleSpreadsheetsHelper.prototype.addNewLocalisation = function(spreadsheetKey, item, callback) {
	var self = this;
	console.log('Initiated INSERT for key: ' + item.key);
	this.getWorksheetsInfo(spreadsheetKey, function(err, response) {
		if(response.status === 'ok') {
			async.eachSeries(response.data, function(worksheet, asyncCompleted) {
				var data = '<entry xmlns="http://www.w3.org/2005/Atom" ' +
								'xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">' +
								'<gsx:context>' + item.context + '</gsx:context>' +
								'<gsx:key>' + item.key + '</gsx:key>' +
								'<gsx:originalvalue>' + item.originalValue + '</gsx:originalvalue>' +
								'<gsx:project>' + item.project + '</gsx:project>' +
								'<gsx:translation></gsx:translation>' +
							'</entry>';
				var url = worksheet.link;				
				request.post({url: url, jwt: jwt, headers: {'Content-Type' : 'application/atom+xml'}, body: data}, function(err, httpResponse, body) {
					if(err) {
						asyncCompleted(err);
					} else{
						var xml = new XML(body);
						var id = xml.child('id').getValue();
						if(id) {
							console.log('New key added to ' + worksheet.lang);
							console.log('New key\'s id: ' + id);
							asyncCompleted();
						} else {
							asyncCompleted('Error while adding new key to ' + worksheet.lang);
							console.log('Revert back inserts');
							self.deleteLocalisation(spreadsheetKey, item);
						}
					}					
				});	
			}, function(err) {
				if(err) {
					console.log(err);
					return callback(err, {status: 'error'});
				} else {						
					dbHelper.logTranslationAdd(item);
					return callback(null, {status: 'ok'});
				}
			});
		} else {
			return callback(err, response);
		}		
	});
};

/**
 * Removes given localisation from the spreadsheet
 * @param  {String}   spreadsheetKey Spreadsheet Key
 * @param  {Object}   item Localisation Item
 * @param  {Function} callback
 */
GoogleSpreadsheetsHelper.prototype.deleteLocalisation = function(spreadsheetKey, item, callback) {
	var self = this;
	var translationKey = item.key;
	var project = item.project;
	var callback = callback || function() {};
	console.log('Initiated DELETE for key: ' + translationKey);
	this.getWorksheetsInfo(spreadsheetKey, function(err, response) {
		if(response.status === 'ok') {
			async.each(response.data, function(worksheet, asyncCompleted) {
				var url = worksheet.link;
				self.getWorksheetData(url, function(err, response) {
					if(response.status === 'ok') {
						var itemToDelete = _.findWhere(response.data, {key: translationKey, project: project});
						if(itemToDelete) {
							request.del({url: itemToDelete.editLink, jwt: jwt, headers: {'Content-Type' : 'application/atom+xml'}}, function(err, httpResponse, body) {
								if(err) {
									console.log('Error while removing key from ' + itemToDelete.lang + '. Reason: ' + err);
								} else{
									console.log('Deleted from ' + itemToDelete.lang + ' lang!');
								}
								asyncCompleted();						
							});
						} else {
							asyncCompleted();
						}
					}
				});
			}, function(err) {
				if(err) {
					console.log(err);
					return callback(err, {status: 'error'});
				} else {						
					dbHelper.logTranslationDelete(item);
					return callback(null, {status: 'ok'});
				}
			});
		} else {
			return callback(err, response);
		}		
	});	
};

/**
 * Returns cell-based spreadsheets data divided by language using spreadsheet key
 * @param  {String}   spreadsheetKey Spreadsheet Key
 * @param  {Function} callback
 * @return {Object} Object with lang:Array structure (in 'data' property). 
 */
GoogleSpreadsheetsHelper.prototype.getSpreadsheetData = function(spreadsheetKey, callback) {
	var result = {};
	this.getWorksheetsInfo(spreadsheetKey, function(err, response) {
		if(response.status === 'ok') {
			async.each(response.data, function(item, asyncCompleted) {
				var url = item.link + '?alt=json';
				var lang = item.lang;
				request.get({url: url, jwt: jwt}, function(err, response, body) {
					if(!body) {
						console.log('Empty response for lang ' + lang);
					}
					var parsed;
					try {
						parsed = JSON.parse(body);
					} catch (e) {
						console.log('Error during parsing ' + lang);
					}
					if(parsed) {
						var entries = parsed.feed.entry;
						result[lang] = parseLocalisationList(entries, lang);
					}
					asyncCompleted();
				});				
			}, function(err) {
				if(err) {
					console.log(err);
					return callback(err, {status: 'error'});
				} else {
					return callback(null, {status: 'ok', data: result});
				}
			});
		} else {
			return callback(err, response);
		}
	});
}

/**
 * Returns cell-based data from worksheet using worksheet url
 * @param  {String}   url Worksheet URL
 * @param  {Function} callback
 * @return {Array} Array of cells
 */
GoogleSpreadsheetsHelper.prototype.getWorksheetData = function(url, callback) {
	request.get({url: url + '?alt=json', jwt: jwt}, function(err, response, body) {
		if(!body) {
			return callback("Empty response", {status: 'error', data: []});
		}
		var parsed;
		try {
			parsed = JSON.parse(body);
		} catch (e) {
			return callback("Can't parse worksheet", {status: 'error', data: []});
		}
		var langRegexp = /\((.*)\)/;
		var lang = parsed.feed.title.$t.match(langRegexp);
		var entries = parsed.feed.entry;
		var result = parseLocalisationList(entries, lang[1]);
		return callback(null, {status: 'ok', data: result});
	});	
};

/**
 * Returns worksheets information (name, lang, link) using spreadsheetKey key
 * @param  {String}   spreadsheetKey Spreadsheet Key
 * @param  {Function} callback
 * @return {Array} Array of worksheets
 */
GoogleSpreadsheetsHelper.prototype.getWorksheetsInfo = function(spreadsheetKey, callback) {
	var self = this;
	var url = this.root + '/worksheets/' + spreadsheetKey + '/private/full?alt=json';
	request.get({url: url, jwt: jwt}, function(err, response, body) {
		if(!body) {
			return callback("Empty response", {status: 'error', data: []});
		}
		try {
			parsed = JSON.parse(body);
		} catch (e) {
			return callback(e, {status: 'error', data: []});
		}
		if(parsed) {
			var worksheets = parsed.feed.entry.slice(1);
			var langRegexp = /\((.*)\)/;
			var result = worksheets.map(function(item) {
				var lang = item.content.$t.match(langRegexp);
				var link = _.findWhere(item.link, {rel: self.listFeedRel})			
				return {
					name: item.content.$t,
					lang: lang ? lang[1] : null,
					link: link ? link.href : null
				};
			});
			return callback(null, {status: 'ok', data: result});
		}
	});
};

/**
 * Check whether spreadsheet keys are consistent across all worksheets
 * @param  {String}   spreadsheetKey Spreadsheet Key
 * @param  {Function} callback
 * @return {Object} Object with inconsistent values
 */
GoogleSpreadsheetsHelper.prototype.checkSpredsheetConsistent = function(spreadsheetKey, callback) {
	var self = this;
	this.getAllSpreasheetKeys(spreadsheetKey, function(err, result) {
		if(!err) {
			var allKeys = result.data;
			self.getSpreadsheetData(spreadsheetKey, function(err, result) {
				var data = {};
				_.each(result.data, function(value, lang) {
					data[lang] = _.uniq(_.map(value, function(it){
						return it.key;
					}));
				});
				var consistency = {};
				_.each(data, function(keys, lang) {
					var difference = _.difference(allKeys, keys);
					if(difference.length !== 0) {
						consistency[lang] = difference;
					}
				});

				callback(null, {status: 'ok', data: consistency});
			});
		} else {
			callback(err, {status: 'error'});
			console.log(err);
		}
	});
};

/**
 * Returns unique union of all localisation keys
 * @param  {String}   spreadsheetKey Spreadsheet Key
 * @param  {Function} callback
 * @return {Array}
 */
GoogleSpreadsheetsHelper.prototype.getAllSpreasheetKeys = function(spreadsheetKey, callback) {
	this.getSpreadsheetData(spreadsheetKey, function(err, result) {
		if(!err) {
			var data = [];
			_.each(result.data, function(value) {
				data.push(_.map(value, function(it){
					return it.key;
				}));
			});
			var uniqueKeys = _.uniq(_.prototype.union.apply(this, data));
			callback(null, {status: 'ok', data: uniqueKeys});
		} else {
			callback(err, {status: 'error', data: []});
		}
	});
};

module.exports = new GoogleSpreadsheetsHelper();
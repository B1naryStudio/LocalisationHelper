var request = require('request');
var _ = require('underscore');
var auth = require('./googleAuth');
var async = require('async');
var dbHelper = require('./dbHelper');

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

GoogleSpreadsheetsHelper.prototype.updateCell = function(key, item, callback) {
	var token = auth.getToken();
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
	request.put({url: url, headers: {'Content-Type' : 'application/atom+xml'}, body: data}, function(err, httpResponse, body) {
		if(err) {
			callback(err, {result: 'error'});
		} else if(body.indexOf(item.translation) > -1) {
			callback(null, {result: 'ok'});
		} else {
			callback('Smth wrong during google API reques.', {result: 'error'});
		}
	}).auth(null, null, true, token);
};

GoogleSpreadsheetsHelper.prototype.addNewCell = function(key, item, callback) {
	var token = auth.getToken();
	this.getWorksheetsData(key, function(err, worksheets) {
		var count = worksheets.length;
		var requestsFinished = 0;
		if(!err) {
			_.each(worksheets, function(worksheet) {
				var data = '<entry xmlns="http://www.w3.org/2005/Atom" ' +
								'xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">' +
								'<gsx:context>' + item.context + '</gsx:context>' +
								'<gsx:key>' + item.key + '</gsx:key>' +
								'<gsx:originalvalue>' + item.originalValue + '</gsx:originalvalue>' +
								'<gsx:project>' + item.project + '</gsx:project>' +
								'<gsx:translation>' + item.translation + '</gsx:translation>' +
							'</entry>';
				var url = worksheet.link;
				request.post({url: url, headers: {'Content-Type' : 'application/atom+xml'}, body: data}, function(err, httpResponse, body) {
					++requestsFinished;
					if(err) {
						console.log(err);
					} else{
						console.log('posted!');
					}
					if(count === requestsFinished) {
						callback(null, "Added");
					}
				}).auth(null, null, true, token);			
			});
		} else {
			callback("Can't request worksheets data");
		}
	});
};

GoogleSpreadsheetsHelper.prototype.getSpreadsheetJson = function(key, callback) {
	var result = {};
	var token = auth.getToken();
	this.getWorksheetsData(key, function(err, worksheets) {
		var count = worksheets.length;
		var requestsFinished = 0;
		_.each(worksheets, function(item) {
			var url = item.link + '?alt=json';
			var lang = item.lang;		
			request.get(url, function(err, response, body) {
				++requestsFinished;
				if(!body) {
					callback("Empty response", []);
				}
				var parsed;
				try {
					parsed = JSON.parse(body);
				} catch (e) {
					callback(e, []);
				}
				if(parsed) {
					var entries = parsed.feed.entry;
					result[lang] = parseLocalisationList(entries, lang);
				} else {
					console.log('Error during parsing ' + lang);
				}
				if(count === requestsFinished) {
					callback(null, result);
				}
			}).auth(null, null, true, token);
		});
	});
}

GoogleSpreadsheetsHelper.prototype.getWorksheetJson = function(url, callback) {
	var token = auth.getToken();
	request.get(url + '?alt=json', function(err, response, body) {
		if(!body) {
			callback("Empty response", []);
		}
		var parsed;
		try {
			parsed = JSON.parse(body);
		} catch (e) {
			callback(e, []);
		}
		if(parsed) {
			var langRegexp = /\((.*)\)/;
			var lang = parsed.feed.title.$t.match(langRegexp);
			var entries = parsed.feed.entry;
			var result = parseLocalisationList(entries, lang[1]);
			callback(null, result);
		} else {
			callback("Can't parse worksheet", []);
		}
	}).auth(null, null, true, token);	
};

// Get worksheets data (tabs inside spreadsheet) using spreadsheet key
GoogleSpreadsheetsHelper.prototype.getWorksheetsData = function(key, callback) {
	var token = auth.getToken();
	var self = this;
	var url = this.root + '/worksheets/' + key + '/private/full?alt=json';
	request.get(url, function(err, response, body) {
		if(!body) {
			callback("Empty response", []);
		}
		try {
			parsed = JSON.parse(body);
		} catch (e) {
			callback(e, []);
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
			callback(null, result);
		}
	}).auth(null, null, true, token);
};

module.exports = new GoogleSpreadsheetsHelper();
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

GoogleSpreadsheetsHelper.prototype.updateCell = function(item, callback) {
	var token = auth.getToken();
	var data = '<entry xmlns="http://www.w3.org/2005/Atom" ' +
					'xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">' +
					'<id>' + item.id + '</id>' +
					'<gsx:context>' + item.context + '</gsx:context>' +
					'<gsx:key>' + item.key + '</gsx:key>' +
					'<gsx:originalValue>' + item.originalValue + '</gsx:originalValue>' +
					'<gsx:project>' + item.project + '</gsx:project>' +
					'<gsx:translation>' + item.translation + '</gsx:translation>' +
				'</entry>';
	var url = item.editLink;
	request.put({url: url, headers: {'Content-Type' : 'application/atom+xml'}, body: data}, function(err, httpResponse, body) {
		if(err) {
			console.log(err);
		} else{
			console.log('posted!');
		}
		callback();
	}).auth(null, null, true, token);
};

GoogleSpreadsheetsHelper.prototype.addNewCell = function(key, cell, callback) {
	var token = auth.getToken();
	var data = ''
	// var url = this.root + '/list/' + key + '/private/full';
	var data = '<entry xmlns="http://www.w3.org/2005/Atom" ' +
					'xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">' +
					'<gsx:context>Nothing here</gsx:context>' +
					'<gsx:key>TEST->KEY</gsx:key>' +
					'<gsx:originalValue>Original Value</gsx:originalValue>' +
					'<gsx:project>TEST PROJECT</gsx:project>' +
					'<gsx:translation>Translation value</gsx:translation>' +
				'</entry>';
	var url = 'https://spreadsheets.google.com/feeds/list/1U23Aw8HXe82Kbn3AqLZB0ryUcGtVpIatoZQowzl0aho/ol906cu/private/full?alt=json';
	request.post({url: url, headers: {'Content-Type' : 'application/atom+xml'}, body: data}, function(err, httpResponse, body) {
		if(err) {
			console.log(err);
		} else{
			console.log('posted!');
		}
		callback();
	}).auth(null, null, true, token);
};

GoogleSpreadsheetsHelper.prototype.getSpreadsheetJson = function(key, callback) {
	var result = {};
	var token = auth.getToken();
	this.getWorksheetsData(key, function(worksheets) {
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
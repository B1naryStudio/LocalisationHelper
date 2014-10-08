var fs = require('fs');
var _ = require('underscore');

function FileSystemHelper() {

};

FileSystemHelper.prototype.generateJsonFiles = function(localisation) {
	for(var lang in localisation) {
		var currentLoc = localisation[lang];
		var vis = _.where(currentLoc, {project: 'VIS'});
		var csb = _.where(currentLoc, {project: 'CSB'});
		var visContent = {
			soccer: {
				stats: {},
				eventCodes: {},
				strings: {}
			},
			basketball: {
				stats: {},
				eventCodes: {},
				strings: {}
			},
			icehockey: {
				stats: {},
				eventCodes: {},
				strings: {}
			},
			volleyball: {
				stats: {},
				eventCodes: {},
				strings: {}
			}
		};
		var csbContent = {};
		_.each(vis, function(item) {
			var parsedKey = item.key.split('->');
			var section = '';
			var sport = '';
			var key = parsedKey[2];
			if(parsedKey[1] === 'STR') {
				section = 'strings';
			} else if(parsedKey[1] === 'CODES') {
				section = 'eventCodes';
			} else {
				section = 'stats';
			}
			if(parsedKey[0] === 'COMMON') {
				sport = 'all';
			} else if(parsedKey[0] === 'FB') {
				sport = 'soccer';
			} else if(parsedKey[0] === 'BB') {
				sport = 'basketball';
			} else if(parsedKey[0] === 'IH') {
				sport = 'icehockey';
			} else {
				sport = 'volleyball';
			}

			if(sport === 'all') {
				visContent.soccer[section][key] = item.translation;
				visContent.basketball[section][key] = item.translation;
				visContent.icehockey[section][key] = item.translation;
				visContent.volleyball[section][key] = item.translation;
			} else {
				visContent[sport][section][key] = item.translation;
			}
		});
		_.each(csb, function(item) {
			csbContent[item.key] = item.translation;
		});
		fs.writeFile('localisation/vis/soccer/' + lang + '.json', JSON.stringify(visContent.soccer), function(err) {
			if(err) {
				console.log(err);
			} else {
				console.log(lang + '.json was updated.');
			}
		});
		fs.writeFile('localisation/vis/basketball/' + lang + '.json', JSON.stringify(visContent.basketball), function(err) {
			if(err) {
				console.log(err);
			} else {
				console.log(lang + '.json was updated.');
			}
		});
		fs.writeFile('localisation/vis/icehockey/' + lang + '.json', JSON.stringify(visContent.icehockey), function(err) {
			if(err) {
				console.log(err);
			} else {
				console.log(lang + '.json was updated.');
			}
		});
		fs.writeFile('localisation/vis/volleyball/' + lang + '.json', JSON.stringify(visContent.volleyball), function(err) {
			if(err) {
				console.log(err);
			} else {
				console.log(lang + '.json was updated.');
			}
		});
		fs.writeFile('localisation/csb/' + lang + '.json', JSON.stringify(csbContent), function(err) {
			if(err) {
				console.log(err);
			} else {
				console.log(lang + '.json was updated.');
			}
		});
	}	
};

module.exports = new FileSystemHelper();
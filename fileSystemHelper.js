var fs = require('fs');
var _ = require('underscore');
var async = require('async');
var archiver = require('archiver');

function FileSystemHelper() {

};

FileSystemHelper.prototype.generateJsonFiles = function(localisation, callback) {
	var time = new Date();
	var prefix = time.getDate() + '/' + time.getMonth() + '/' + time.getFullYear();
	var writtenLangs = 0;
	var langsCount = Object.keys(localisation).length;
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
		var toBeWrited = [
			{
				path: 'localisation/vis/soccer/' + lang + '.json',
				content: JSON.stringify(visContent.soccer, null, 4)
			},			
			{
				path: 'localisation/vis/basketball/' + lang + '.json',
				content: JSON.stringify(visContent.basketball, null, 4)
			},
			{
				path: 'localisation/vis/icehockey/' + lang + '.json',
				content: JSON.stringify(visContent.icehockey, null, 4)
			},
			{
				path: 'localisation/vis/volleyball/' + lang + '.json',
				content: JSON.stringify(visContent.volleyball, null, 4)
			},
			{
				path: 'localisation/csb/' + lang + '.json',
				content: JSON.stringify(csbContent, null, 4)
			},
		];
		async.each(toBeWrited, function (file, callback) {
			fs.writeFile(file.path, JSON.stringify(file.content, null, 4), function (err) {
				if (err) {
					console.log(err);
				}
				else {
					console.log(file.path + '.json was updated.');
				}

				callback();
			});

		}, function (err) {

			if (err) {
				// One of the iterations produced an error.
				// All processing will now stop.
				console.log('A file failed to process');
			}
			else {
				console.log('All files have been processed successfully');
			}
			writtenLangs++;
			if(writtenLangs === langsCount) {
				var outputPath = 'localisation.zip';
				var output = fs.createWriteStream(outputPath);
				var zipArchive = archiver('zip');

				output.on('close', function() {
					console.log('done with the zip', outputPath);
					callback(fs.createReadStream('localisation.zip'));
				});

				zipArchive.pipe(output);

				zipArchive.bulk([
					{ src: [ '**/*.json' ], cwd: 'localisation/', expand: true }
				]);

				zipArchive.finalize();
			}
		});
	}	
};

module.exports = new FileSystemHelper();
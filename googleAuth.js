var request = require('request');
var token = '';

function GoogleAuth() {
	this.scopes = 'https://spreadsheets.google.com/feeds';
	this.clientId = '551651064595-to4iqmvl49qu2rf3v8d7dthpq1fnsfqk.apps.googleusercontent.com';
	this.clientSecret = 'mzwMOMzkqrqVuUjQO-Js11Hp';
};

GoogleAuth.prototype.getToken = function() {
	return token;
};

GoogleAuth.prototype.generateAuthLink = function(req) {
	var redirectUrl = req.protocol + '://' + req.get('host') + '/code';

	var url = 'https://accounts.google.com/o/oauth2/auth?scope=' + this.scopes + 
			'&client_id=' + this.clientId + 
			'&redirect_uri=' + redirectUrl +
			'&login_hint=localisationimportservice@gmail.com' +
			'&response_type=code' + 
			'&access_type=offline';

	return url;
};

GoogleAuth.prototype.requestToken = function(req, callback) {
	var code = req.query.code;
	if(code) {
		var url = 'https://accounts.google.com/o/oauth2/token';
		var redirectUrl = req.protocol + '://' + req.get('host') + '/code';

		var data = {
			grant_type: 'authorization_code',
			code: req.query.code,
			client_id: this.clientId,
			client_secret: this.clientSecret,
			redirect_uri: redirectUrl
		};

		request.post(url, { form: data }, function(err, response, body) {
			var parsed = JSON.parse(body);
			console.log(parsed);
			if(parsed.access_token && parsed.expires_in !== undefined){
				token = parsed.access_token;
				callback(token);
			} else {
				callback(null);
			}
		});
	}
};

module.exports = new GoogleAuth();
var spreadsheetKey = '1LhZbstNbIyPyzwMSJyZyAmWPwtw0Uwg5aSPUaAu370s';
var auth = require('./authHelper');

function checkAuth(req, res, next) {
	if(!req.session.auth) {
		return res.render('login.jade');
	}
	var user = req.session.auth;
	auth.checkUser(user, function(err, result) {
		if(err) {
			res.render('login.jade');		  
		} else {
			req.session.auth = result.data.user;
			next();
		}
	});
}

function isAdmin(req, res, next) {
	if(!req.session.auth || req.session.auth.role !== 'admin') {
		req.session.auth = null;
		res.render('login.jade', {error: 'You are not allowed to view this page. Login using another credentials.'});
	} else {
		next();
	}
}

function changeCurrentKey (req, res) {
	var key = req.body.key;
	if(key) {
		spreadsheetKey = key;
		res.redirect('/');
	} else {
		res.json({error: 'New key is not valid'});
	}
}

function getCurrentKey() {
	return spreadsheetKey;
}

module.exports = {
	checkAuth: checkAuth,
	isAdmin: isAdmin,
	changeCurrentKey: changeCurrentKey,
	currentKey: getCurrentKey
};
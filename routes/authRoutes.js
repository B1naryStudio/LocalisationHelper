var auth = require('../helpers/authHelper');

module.exports = function(app) {
	app.post('/login', function(req, res) {
		var user = {
			name : req.body.name,
			pass : req.body.pass
		};
		auth.signIn(user, function(err, result) {
			if(err) {
				res.render('login.jade', {error: err});			  
			} else {
				req.session.auth = result.data.user;
				res.redirect('/');
			}
		});
	});

	app.get('/logout', function(req, res) {
		req.session.auth = null;
		res.redirect('/');
	});
};
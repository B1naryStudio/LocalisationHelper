var auth = require('../helpers/authHelper');

module.exports = function(app) {
	app.get('/user', function(req, res) {
		auth.getUsers(function(err, result) {
			if(!err) {
				res.json(result);
			} else {
				res.json({error: err});
			}
		});
	});

	app.post('/user', function(req, res) {
		var user = {
			name : req.body.name,
			pass : req.body.pass,
			role : req.body.role
		};
		auth.register(user, function(err) {
			if(!err) {
				res.json({status: 'ok'});
			} else {
				res.json({error: err});
			}
		});
	});

	app.put('/user', function(req, res) {
		var user = {
			name : req.body.name,
			pass : req.body.pass,
			role : req.body.role
		};
		auth.updateUser(user, function(err) {
			if(!err) {
				res.json({status: 'ok'});
			} else {
				res.json({error: err});
			}
		});
	});
};
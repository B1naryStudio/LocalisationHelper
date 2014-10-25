var pass = require('pwd');
var dbHelper = require('./dbHelper');

function AuthHelper () {
	this.SALT_WORK_FACTOR = 10;
	this.register({name: 'admin', pass: 'admin', role: 'admin'}, function() {
		
	});
}

AuthHelper.prototype.register = function(user, callback) {
	if(!user.name || !user.pass) {
		return callback("Please check your user");		
	}
	pass.hash(user.pass, function(err, salt, hash){
		if(!err) {		
			user.salt = salt;
			user.pass = hash;
			dbHelper.createUser(user, function(err, result) {
				if(err) {
					return callback(err);
				} else {
					callback(null, result);
				}
			});
		} else {
			callback(err);
		}
	});
};

AuthHelper.prototype.signIn = function(candidateUser, callback) {
	dbHelper.getUser(candidateUser, function(err, user) {
		if(!user || err) {
			return callback('Check your credentials')
		}
		pass.hash(candidateUser.pass, user.salt, function(err, hash){
			if(user.pass == hash) {
				callback(null, {status: 'ok', data: {user: user}});
			} else {
				callback('Check your password');
			}
		});
	});
};

module.exports = new AuthHelper();
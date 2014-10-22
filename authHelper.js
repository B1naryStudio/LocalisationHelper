var bcrypt = require('bcrypt');
var dbHelper = require('./dbHelper');

function AuthHelper () {
	this.SALT_WORK_FACTOR = 10;
}

AuthHelper.prototype.register = function(user) {
	if(!user.name || !user.password) {
		return callback("Please check your user");		
	}
	bcrypt.genSalt(this.SALT_WORK_FACTOR, function(err, salt, callback) {
		if(err) {
			callback(err);
		} else {
			bcrypt.hash(user.password, salt, function(err, hash) {
				if(err) {
					callback(err);
				} else {
					user.password = hash;
					user.salt = salt;
					dbHelper.createUser(user, function(err, result) {
						if(result.status === 'ok') {
							callback(null);
						} else {
							callback(err);
						}
					});
				}
			});
		}
	});
};

AuthHelper.prototype.signIn = function(candidateUser, callback) {
	dbHelper.getUser(candidateUser, function(err, user) {
		bcrypt.compare(candidateUser.password, user.password, function(err, isMatch) {
			if (err) {
				return callback(err);
			}
			callback(null, isMatch);
		});		
	});
};
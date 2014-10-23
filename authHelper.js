var bcrypt = require('bcrypt');
var dbHelper = require('./dbHelper');

function AuthHelper () {
	this.SALT_WORK_FACTOR = 10;
	this.register({name: 'admin', password: 'admin', role: 'admin'}, function() {
		
	});
}

AuthHelper.prototype.register = function(user, callback) {
	if(!user.name || !user.password) {
		return callback("Please check your user");		
	}
	bcrypt.genSalt(this.SALT_WORK_FACTOR, function(err, salt) {
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
		var hash = bcrypt.hashSync(user.password, user.salt);
		bcrypt.compare(hash, user.password, function(err, isMatch) {
			if (err) {
				return callback(err);
			}
			callback(null, isMatch);
		});		
	});
};

module.exports = new AuthHelper();
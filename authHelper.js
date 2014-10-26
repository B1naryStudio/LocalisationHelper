var pass = require('pwd');
var dbHelper = require('./dbHelper');

function AuthHelper () {
	this.register({name: 'admin', pass: 'admin', role: 'admin'}, function() {
		
	});
}

function mapUsers(users) {
	return users.map(function(user) {
		return {
			name: user.name,
			role: user.role
		};
	});
}

AuthHelper.prototype.register = function(user, callback) {
	if(!user.name || !user.pass || !user.role) {
		return callback("Please check your user info");		
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

AuthHelper.prototype.updateUser = function(candidateUser, callback) {
	if(!candidateUser.name || !candidateUser.pass || !candidateUser.role) {
		return callback("Please check your user info");		
	}
	dbHelper.getUser(candidateUser, function(err, existedUser) {
		if(!existedUser || err) {
			return callback('The user with such name doesn\'t exist');
		}
		pass.hash(candidateUser.pass, existedUser.salt, function(err, hash){
			if(existedUser.pass == hash) {
				pass.hash(candidateUser.pass, function(err, salt, hash){
					if(!err) {		
						existedUser.salt = salt;
						existedUser.pass = hash;
						dbHelper.updateUser(existedUser, function(err, user) {
							if(err) {
								return callback(err);
							}
							callback(null, {status: 'ok', data: {user: user}});
						});
					} else {
						callback(err);
					}
				});
			} else {
				callback('Check your password');
			}
		});
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

AuthHelper.prototype.getUsers = function(callback) {
	dbHelper.getAllUsers(function(err, users) {
		if(err) {
			return callback(err);
		}
		callback(null, {status: 'ok', data: {users: mapUsers(users)}});
	});
};

module.exports = new AuthHelper();
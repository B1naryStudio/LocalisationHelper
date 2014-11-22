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

/**
 * Register user in a system
 * @param  {Object}   user User Object
 * @param  {Function} callback
 */
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

/**
 * Update user's data
 * @param  {Object}   candidateUser
 * @param  {Function} callback
 */
AuthHelper.prototype.updateUser = function(candidateUser, callback) {
	if(!candidateUser.name || !candidateUser.pass || !candidateUser.role) {
		return callback("Please check your user info");		
	}
	dbHelper.getUser(candidateUser, function(err, existedUser) {
		if(!existedUser || err) {
			return callback('The user with such name doesn\'t exist');
		}
		pass.hash(candidateUser.pass, function(err, salt, hash){
			if(!err) {		
				existedUser.salt = salt;
				existedUser.pass = hash;
				existedUser.role = candidateUser.role;
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
	});
};

/**
 * Validates user's data
 * @param  {Object}   user
 * @param  {Function} callback
 */
AuthHelper.prototype.checkUser = function(user, callback) {
	dbHelper.getUser(user, function(err, user) {
		if(!user || err) {
			return callback('Check your credentials')
		}
		callback(null, {status: 'ok', data: {user: user}});
	});
};

/**
 * Signs in user in a system
 * @param  {Object}   candidateUser User to sign in
 * @param  {Function} callback
 */
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

/**
 * Get all user's data
 * @param  {Function} callback
 * @return {Array} List of users
 */
AuthHelper.prototype.getUsers = function(callback) {
	dbHelper.getAllUsers(function(err, users) {
		if(err) {
			return callback(err);
		}
		callback(null, {status: 'ok', data: {users: mapUsers(users)}});
	});
};

module.exports = new AuthHelper();
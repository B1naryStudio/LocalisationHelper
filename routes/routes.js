var authRoutes = require('./authRoutes');
var localisationRoutes = require('./localisationRoutes');
var toolsRoutes = require('./toolsRoutes');
var userRoutes = require('./userRoutes');

module.exports = function(app) {
	return {
		authRoutes: new authRoutes(app),
		localisationRoutes: new localisationRoutes(app),
		toolsRoutes: new toolsRoutes(app),
		userRoutes: new userRoutes(app)
	};
};
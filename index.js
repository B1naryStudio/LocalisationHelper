var express = require('express');
var app = express();
var session = require('express-session');
var bodyParser = require('body-parser');
var utils = require('./helpers/utils');
var dbHelper = require('./helpers/dbHelper');
var Routes = require('./routes/routes');
var staticDir = __dirname + '/public';

app.set('db-uri', 'mongodb://localhost:27017/localisation');
app.use(express.static(staticDir));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb', parameterLimit: 50000 }))
app.use(bodyParser.json({limit: '50mb', parameterLimit: 5000}))
app.use(session({secret: 'localisation secret'}))
app.set('views', staticDir);
app.set('view engine', 'jade');

dbHelper.initialize(app.get('db-uri'));

(function decorateLog() {
	var originalLog = console.log;
	console.log = function(log) {
		var date = new Date();
		var text = '[' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '] ' + log;
		originalLog(text);
	}
})();

var routes = new Routes(app);

app.get('/', utils.checkAuth, function(req, res) {
	var user = req.session.auth;
	res.render('index.jade', {user: user, key: utils.currentKey()});
});

app.get('/accounts', utils.isAdmin, function(req, res) {
	res.render('users.jade');
});

app.post('/newkey', utils.changeCurrentKey);

app.listen(3000);
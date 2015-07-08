var express = require('express');
var router = express.Router();

function getParams(req, link) {	
	return 	{
				host: req.query.host != 'undefined' ? req.query.host : 'localhost', 
				port: req.query.port != 'undefined' ? req.query.port : 8080, 
				activelink: link
			};
}

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', null);
});

router.get('/createDevice', function(req, res) {
  res.render('createDevice', getParams(req, 'createDevice'));
});

router.get('/createSensor', function(req, res) {
  res.render('createSensor', getParams(req, 'createSensor'));
});

router.get('/insertValues', function(req, res) {	
	res.render('insertValues', getParams(req, 'insertValues'));
});

router.get('/getValues', function(req, res) {	
	res.render('getValues', getParams(req, 'getValues'));
});

router.get('/query', function(req, res) {	
	res.render('query', getParams(req, 'query'));
});

module.exports = router;

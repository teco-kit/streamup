var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
	console.log('########');
  res.render('index', null);
});

module.exports = router;

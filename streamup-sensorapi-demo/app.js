var express = require('express');
var path = require('path');
var logger = require('morgan');
var routes = require('./routes/index');

var PORT = 8082; 

var app = express();

app.use(logger('dev'));
app.use(function(req, res, next) {
  req.headers['if-none-match'] = 'no-match-for-this';
  next();    
});


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", ["X-Requested-With", "Cache-Control"]);
  next();
}); 


app.use(express.static(path.join(__dirname, 'public')));

app.use('/local', express.static(path.join(__dirname, '/public/index-local.html')))
app.use('/local/sensor', express.static(path.join(__dirname, '/public/sensor-local.html')))
app.use('/sensor', express.static(path.join(__dirname, '/public/sensor.html')))

app.use('/', routes);



/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.set('port', process.env.PORT || PORT);

module.exports = app;

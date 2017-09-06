var express = require('express');
var router = express.Router();
var http = require('http');


var starturl = 'rotonde.nanoleptic.net';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.writeHead(302, {
    'Location': "/"+starturl
  });
  res.end();
});

/* GET home page. */
router.get('/:url', function(req, res, next) {
  http.get(
    {
        host: req.params.url,
        headers: {
          accept: 'application/json'
        }
    }, (hres) => {
    const { statusCode } = hres;
    const contentType = hres.headers['content-type'];
    let error;
    if (statusCode !== 200) {
      error = new Error('Request Failed.\n' +
                        `Status Code: ${statusCode}`);
    }/* else if (!/^application\/json/.test(contentType)) {
      error = new Error('Invalid content-type.\n' +
                        `Expected application/json but received ${contentType}`);
    }*/
    if (error) {
      next();
      // consume response data to free up memory
      hres.resume();
      return;
    }

    hres.setEncoding('utf8');
    let rawData = '';
    hres.on('data', (chunk) => { rawData += chunk; });
    hres.on('end', () => {
      try {
        const parsedData = JSON.parse(rawData);
        res.render('rotonde', parsedData);
      } catch (e) {
        next()
      }
    });
  }).on('error', (e) => {
    next()
  });
});

module.exports = router;

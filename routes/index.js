var express = require('express');
var router = express.Router();
var http = require('http');
var auth = require('basic-auth')
var async = require('async')
var request = require('request');

var starturl = 'logs.spaceshipsin.space';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.writeHead(302, {
    'Location': "/"+starturl
  });
  res.end();
});

router.get('/post', function(req, res, next) {
  var credentials = auth(req)

  if (!credentials || credentials.name !== 'john' || credentials.pass !== 'secret') {
    res.statusCode = 401
    res.setHeader('WWW-Authenticate', 'Basic realm="example"')
    res.end('Access denied')
  } else {
    res.end('Access granted')
  }
})

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
        
        getAll(parsedData.portal, function(feed) {
            parsedData.portalFeed = feed;
            res.render('rotonde', parsedData);
        });
        
      } catch (e) {
        next()
      }
    });
  }).on('error', (e) => {
    next()
  });
});

function httpGet(url, callback) {
  var prefix = 'http://';
  if (url.substr(0, prefix.length) !== prefix)
  {
      url = prefix + url;
  }
  const options = {
    url :  url,
    json : true
  };
  request(options,
    function(err, res, body) {
      if (typeof body == 'object'){
        body.url = url;
      }
      callback(err, body);
    }
  );
}

function getAll(rotondes, cb) {
  async.map(rotondes, httpGet, function (err, res){
    if (err){
      cb([]);
      return;
    } else {
      var feed = []
      console.log("-------");
      for (var v in res) {
        if (res.hasOwnProperty(v)) {
          if (typeof res[v] == 'object'){
              var rot = res[v];
              feed = feed.concat(rot.feed.map(function(post){
                return {
                  url: rot.url,
                  profile: rot.profile,
                  post: post
                }
              }));
          }
        }
      }
      feed.sort(function(a, b){
        return a.post.date-b.post.date;
      })
      feed = feed.slice(0,30);
      cb(feed);
    }
  });
}

module.exports = router;

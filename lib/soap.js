"use strict";

var Client = require('./client').Client,
  openWsdl = require('./wsdl').open,
  q = require('q');

var _wsdlCache = {};

function _requestWSDL(url) {
  var wsdl = _wsdlCache[url];
  if (wsdl) {
    return wsdl;
  } else {
    return openWsdl(url)
      .then((data)=> {
        _wsdlCache[url] = data;
        return data;
      })
      .catch((e) => {
        console.error('openWsdl Error : ', e);
      })
  }
}

function createClient(url, options, callback, endpoint) {
  if (typeof options === 'function') {
    endpoint = callback;
    callback = options;
    options = {};
  }
  endpoint = options.endpoint || endpoint;
  return _wsdlCache[url]
    ? callback(null, new Client(_wsdlCache[url], endpoint, options))
    : _requestWSDL(url)
    .then((wsdl) => {
        return callback(null, wsdl && new Client(wsdl, endpoint, options));
      }
    )
    .catch((e)=> {
      console.error("_requestWSDL Error :" + e);
    })
}


exports.createClient = createClient;

// Export Client and Server to allow customization
exports.Client = Client;

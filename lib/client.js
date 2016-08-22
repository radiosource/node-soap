/*
 * Copyright (c) 2011 Vinay Pulim <vinay@milewise.com>
 * MIT Licensed
 */

"use strict";


var HttpClient = require('./http'),
  assert = require('assert'),
  events = require('events'),
  util = require('util'),
  debug = require('debug')('node-soap'),
  request = require('request'),
  findPrefix = {},
  q = require('q'),
  _ = require('underscore');

var Client = function (wsdl, endpoint, options) {
  events.EventEmitter.call(this);
  options = options || {};
  this.wsdl = wsdl;
  this._initializeServices(endpoint);
  this.httpClient = options.httpClient || new HttpClient(options);
};
util.inherits(Client, events.EventEmitter);

Client.prototype.addSoapHeader = function (soapHeader, name, namespace, xmlns) {
  if (!this.soapHeaders) {
    this.soapHeaders = [];
  }
  if (typeof soapHeader === 'object') {
    soapHeader = this.wsdl.objectToXML(soapHeader, name, namespace, xmlns, true);
  }
  return this.soapHeaders.push(soapHeader) - 1;
};

Client.prototype.changeSoapHeader = function (index, soapHeader, name, namespace, xmlns) {
  if (!this.soapHeaders) {
    this.soapHeaders = [];
  }
  if (typeof soapHeader === 'object') {
    soapHeader = this.wsdl.objectToXML(soapHeader, name, namespace, xmlns, true);
  }
  this.soapHeaders[index] = soapHeader;
};

Client.prototype.getSoapHeaders = function () {
  return this.soapHeaders;
};

Client.prototype.clearSoapHeaders = function () {
  this.soapHeaders = null;
};

Client.prototype.addHttpHeader = function (name, value) {
  if (!this.httpHeaders) {
    this.httpHeaders = {};
  }
  this.httpHeaders[name] = value;
};

Client.prototype.getHttpHeaders = function () {
  return this.httpHeaders;
};

Client.prototype.clearHttpHeaders = function () {
  this.httpHeaders = {};
};


Client.prototype.addBodyAttribute = function (bodyAttribute, name, namespace, xmlns) {
  if (!this.bodyAttributes) {
    this.bodyAttributes = [];
  }
  if (typeof bodyAttribute === 'object') {
    var composition = '';
    Object.getOwnPropertyNames(bodyAttribute).forEach(function (prop, idx, array) {
      composition += ' ' + prop + '="' + bodyAttribute[prop] + '"';
    });
    bodyAttribute = composition;
  }
  if (bodyAttribute.substr(0, 1) !== ' ') bodyAttribute = ' ' + bodyAttribute;
  this.bodyAttributes.push(bodyAttribute);
};

Client.prototype.getBodyAttributes = function () {
  return this.bodyAttributes;
};

Client.prototype.clearBodyAttributes = function () {
  this.bodyAttributes = null;
};

Client.prototype.setEndpoint = function (endpoint) {
  this.endpoint = endpoint;
  this._initializeServices(endpoint);
};

Client.prototype.describe = function () {
  var types = this.wsdl.definitions.types;
  return this.wsdl.describeServices();
};

Client.prototype.setSecurity = function (security) {
  this.security = security;
};

Client.prototype.setSOAPAction = function (SOAPAction) {
  this.SOAPAction = SOAPAction;
};

Client.prototype._initializeServices = function (endpoint) {
  var services = this.wsdl.operations;
  for (var name in services) {
    //this[name] = this._defineService(services[name], endpoint);
    this[name] = this._defineMethod(services[name], endpoint);
  }
};


Client.prototype._defineMethod = function (method, location) {
  var self = this;
  var temp;
  return function (args, callback, options, extraHeaders) {
    if (typeof args === 'function') {
      callback = args;
      args = {};
    } else if (typeof options === 'function') {
      temp = callback;
      callback = options;
      options = temp;
    } else if (typeof extraHeaders === 'function') {
      temp = callback;
      callback = extraHeaders;
      extraHeaders = options;
      options = temp;
    }
    self._invoke(method, args, location, function (error, result, raw, soapHeader) {
      callback(error, result, raw, soapHeader);
    }, options, extraHeaders);
  };
};

Client.prototype._invoke = function (method, args, location, callback, options, extraHeaders) {
  var self = this,
    name = method.$name,
    input = method.input,
    output = method.output,
    style = method.style,
    defs = this.wsdl.definitions,
    envelopeKey = this.wsdl.envelopeKey || '',
    ns = defs.$targetNamespace,
    encoding = '',
    location = location || this.wsdl.location,
    message = '',
    xml = null,
    req = null,
    soapAction,
    alias = '',
    headers = {
      "Content-Type": "text/xml; charset=utf-8"
    },
    xmlnsSoap = "xmlns:" + envelopeKey + "=\"http://schemas.xmlsoap.org/soap/envelope/\"";
  options = options || {};
  xml = require('./xml')(this.wsdl, method, args)
  return callback(null, q.nfcall(request.post, {
      url: location,
      form: xml
    })
    .then(_.first)
    .catch((e)=> {
      console.error("Error where sending xml to SOAP server: " + e);
    }));
};

exports.Client = Client;

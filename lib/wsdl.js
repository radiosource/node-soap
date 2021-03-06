"use strict";
const
  request = require('request'),
  fs = require('fs'),
  _ = require('underscore'),
  q = require('q'),
  convert = require('html-to-json')
  ;

function openWsdl(uri) {
  return (
    uri.startsWith('http')
      ? q.nfcall(request, uri)
      .then(_.first)
      .then((response) => {
        if (response.statusCode === 200) {
          return response.body;
        }
        throw new Error('response.statusCode : ' + response.statusCode);
      })
      :
      q.nfcall(fs.readFile, uri)
  ).then((text) => {
      return wsdlToObject(text);
    })
    /*.then((wsdl)=> {
     return wsdl;
     })*/
    .catch((e) => {
      console.error(e);
    })

}

exports.open = openWsdl;

function wsdlToObject(text) {

  return q.nfcall(convert.parse, text, {
      'location': (doc)=> {
        return _.findWhere(doc.find('service').find('port').children(), {name: 'soap:address'}).attribs.location;
      },
      'definitions': (doc) => {
        return _.first(doc.find('definitions')).attribs;
      },
      'operations': (doc)=> {//методы сервера которые можна юзать
        return _toObject(_.compact(_.map(doc.find('operation'), (content) => {
          let input = _.findWhere(content.children, {name: 'input'}),
            output = _.findWhere(content.children, {name: 'output'});

          return input ? {
            name: content.attribs.name,
            input: _.last(input.attribs.message.split(':')),
            output: output ? _.last(output.attribs.message.split(':')) : '',
            soapAction: _.chain(doc.find('operation'))
              .find((el)=> {
                return el.attribs.name === content.attribs.name && _.findWhere(el.children, {name: 'soap:operation'})
              })
              .result('children')
              .findWhere({name: 'soap:operation'})
              .result('attribs')
              .result('soapaction')
              .value()
              .replace('#r', '')
          } : null
        })))
      },
      'messages': (doc)=> {   //реквесты и инпуты в которых указаны аргументы
        return _toObject(_.compact(_.map(doc.find('message'), (content) => {
          let parts = _.map(findPartsRecusive(_.where(content.children, {name: 'part'}), [], 'part'), (part)=> {
            if (part.type.match('types:')) {
              part = setComplexType(part);
            }
            return part;
          });

          return {
            name: content.attribs.name,
            parts: _toObject(parts)
          }
        })))
      },
      'complexTypes': (doc)=> {
        return _toObject(_.compact(_.map(doc.find('complexType'), (content) => {
          let elements = _.findWhere(content.children, {name: 'all'}),
            complexElement = _.findWhere(_.result(_.findWhere(content.children, {name: 'complexcontent'}), 'children') || {}, {name: 'restriction'});
          if (elements) {
            let currentElements = _.map(findPartsRecusive(_.where(elements.children, {name: 'element'}), [], 'element'), (element)=> {
              if (['string', 'integer', 'boolean', 'dateTime', 'float'].indexOf(element.type) > -1) {
                element.type = `xsd:${element.type}`
              } else if (element.type.match('types:')) {
                element = setComplexType(element);
              }
              return element;
            });
            return {
              name: content.attribs.name + '_elements',
              elements: _toObject(currentElements)
            }
          } else if (complexElement) {
            let attribute = _.findWhere(complexElement.children, {name: 'attribute'})
            return {
              name: content.attribs.name + '_complexElement',
              ref: attribute.attribs.ref.replace('soapenc', 'SOAP-ENC'),
              mapKey: attribute.attribs[`types:${attribute.attribs.ref.split(':')[1].toLowerCase()}`].replace(/[\[\]]|types:/g, '')
            }
          }
        })))
      }
    })
    .then((data) => {
      //return q.nfcall(fs.writeFile, './valera.json', JSON.stringify(data, null, '\t'))
      return data;
    }).catch((e)=> {
      console.error('wsdlToObject Error:' + e)
    });

  function setComplexType(element) {
    element.type = `ns2:${element.type.split(':')[1]}`;
    element.mapKey = element.type.split(':')[1];
    element.isComplexType = true;
    return element;
  }

  function _toObject(arr, keyParam) {
    return _.object(_.pluck(arr, keyParam || 'name'), arr)
  }

  function findPartsRecusive(parts, allParts, name) {
    _.each(parts, (part) => {
      allParts.push({
        name: part.attribs.name,
        type: part.attribs.type
      });
      let partsChildrens = _.where(part.children, {name: name});
      _.result(partsChildrens, 'length') ? findPartsRecusive(partsChildrens, allParts, name) : null;
    });
    return allParts;
  }

}


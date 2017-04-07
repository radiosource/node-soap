const
  escape = require('escape-html');
function buildXml(wsdl, method, args) {
  "use strict";
  let xml =
    `<?xml version="1.0" encoding="UTF-8"?>
  <SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
                   xmlns:ns2="${wsdl.definitions['xmlns:types']}"
                   xmlns:ns1="${method.soapAction}"
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
                   SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
    <SOAP-ENV:Body>
        <ns1:${method.name}>
            ${buildElements(wsdl.messages[method.input].parts, args)}
        </ns1:${method.name}>
    </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`
  return xml;

  function buildElements(parts, values) {
    let text = '';
    for (let key in parts) {
      let part = parts[key];

      if (part.isComplexType) {
        let nextMappingPart = wsdl.complexTypes[part.mapKey + '_elements'] || wsdl.complexTypes[part.mapKey + '_complexElement'];
        if (nextMappingPart.mapKey && values[part.name]) {
          part.ref = nextMappingPart.ref;
          part.mapKey = nextMappingPart.mapKey;
        }
      }
      if (part.name in values) {
        text += `<${part.name} `;
        if (part.ref && part.ref.match('arrayType') && values[part.name] instanceof Array) {
          text += `${part.ref}="SOAP-ENC:Struct[${values[part.name].length}]" `;
        }
        text += `xsi:type="${part.type}">`
        if (part.isComplexType) {
          if (part.ref && part.ref.match('arrayType') && values[part.name] instanceof Array) {
            for (let item of values[part.name]) {
              //text += `<${_.initial(part.name).join('')} xsi:type="SOAP-ENC:Struct">`;
              text += `<item xsi:type="SOAP-ENC:Struct">`;
              //елементы комплексного типа items, по каким то немонятным правилам(исходя из всдл файла) называются item, такое название нигде не фигурирует в всдл файле(только в вообш никак не связаном методе)
              text += buildElements(wsdl.complexTypes[part.mapKey + '_elements'].elements, item);
              //text += `</${_.initial(part.name).join('')}>`;
              text += `</item>`;
            }
          } else {
            text += buildElements(wsdl.complexTypes[part.mapKey + '_elements'].elements, values[part.name])
          }
        } else {
          text += escape(values[part.name])
        }
        text += `</${part.name}>`
      }
    }
    return text;
  }
}

module.exports = buildXml;


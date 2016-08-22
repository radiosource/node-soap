var i = 0;
const _ = require('underscore');
function buildXml(wsdl, method, args) {
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
  process.exit(0);

  return xml;

  function buildElements(parts, values) {
    i++;
    let text = '';
    for (let key in parts) {
      let part = parts[key];
      /*if (part.name === 'items') {
       console.log("===part==============");
       console.log(part);
       console.log("==values===============");
       console.log(values);
       console.log("==wsdl.complexTypes===============");
       console.log(wsdl.complexTypes[part.mapKey]);
       process.exit(0);
       }*/
      if (part.isComplexType && wsdl.complexTypes[part.mapKey].mapKey && values[part.name]) {
        let nextMappingPart = wsdl.complexTypes[part.mapKey];
        part.ref = nextMappingPart.ref;
        part.mapKey = nextMappingPart.mapKey;
        console.log("=================");
        console.log(part);
        console.log(wsdl.complexTypes[part.mapKey].elements);
        process.exit(0);
      }
      if (values[part.name]) {
        text += `<${part.name} `;
        text += part.ref ? `${part.ref}="SOAP-ENC:Struct[3]` : `xsi:type="${part.type}">`;

        text += part.isComplexType
          ? buildElements(wsdl.complexTypes[part.mapKey].elements, values[part.name])
          : values[part.name]

        text += `</${part.name}>`
      }


    }

    return text;
  }
}

module.exports = buildXml;


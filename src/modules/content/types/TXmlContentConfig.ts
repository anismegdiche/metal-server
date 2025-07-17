//


export type TXmlContentConfig = {
    "xml-path"?: string; // XML path, if undefined will return the whole XML
    "xml-ignore-attributes"?: boolean; // Ignore XML attributes, default is true
    "xml-attribute-prefix"?: string; // Prefix for XML attributes, default is `@`
    "xml-remove-ns-prefix"?: boolean; // remove namespace string from tag and attribute names, default `true`
};

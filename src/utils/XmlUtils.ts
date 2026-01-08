//
//
//


//
export class XmlUtils {
    static GetNodeByPath(xml: any, path: string): any {
        // Traverse the XML object to find the target node by path
        const segments = path.split('.')
        let currentNode = xml

        for (const segment of segments) {
            if (currentNode && segment in currentNode) {
                currentNode = currentNode[segment]
            } else {
                return undefined // Path not found
            }
        }

        return currentNode
    }

    static SetNodeByPath(xml: any, xmlPath: string, newData: any): any {
        // Traverse the XML object to set the target node by path
        const segments = xmlPath.split('.')
        let currentNode = xml

        for (let i = 0; i < segments.length - 1; i++) {
            const segment = segments[i]
            if (!(segment! in currentNode)) {
                currentNode[segment!] = {} // Create missing segments
            }
            currentNode = currentNode[segment!]
        }

        const targetSegment = segments[segments.length - 1]
        currentNode[targetSegment!] = newData

        return xml
    }
}

import {Reference} from "./Reference.js";

class RelationshipReference extends Reference {
    relationshipType;

    constructor(db, id, comment, relationshipType) {
        super(db, id, comment);
        this.relationshipType = relationshipType;
    }

    static FromBiopax(xref) {
        return new RelationshipReference(
            xref["bp:db"],
            xref["bp:id"],
            xref["bp:comment"],
            xref["bp:relationshipType"],
        )
    }
}

export {RelationshipReference}
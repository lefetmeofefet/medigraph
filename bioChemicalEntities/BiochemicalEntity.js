class BiochemicalEntity {
    get type() {
        return this.constructor.name
    }

    name;
    otherNames = [];

    /**
     * References to publications about the entity
     * @type {[PublicationReference]}
     */
    publicationRefs = [];

    /**
     * References to other DBs containing data about the entity
     * @type {[UnificationReference]}
     */
    unificationRefs = [];

    /**
     * References to sources detailing relationships with the entity
     * @type {[RelationshipReference]}
     */
    relationshipRefs = [];

    constructor({name, otherNames = [], publicationRefs = [], unificationRefs = [], relationshipRefs = []}) {
        this.name = name;
        this.otherNames = otherNames;
        this.publicationRefs = publicationRefs;
        this.unificationRefs = unificationRefs;
        this.relationshipRefs = relationshipRefs;
    }

    getDisplayJson() {
        let genericJson = {
            Type: this.type,
            OtherNames: this.otherNames,
            Publications: this.publicationRefs.map(ref => ({
                [ref.db]: {
                    displayType: "link",
                    link: ref.link,
                    name: ref.id
                }
            })),
            UnificationRefs: this.unificationRefs.map(ref => ({
                [ref.db]: {
                    displayType: "link",
                    link: ref.link,
                    name: ref.id
                }
            })),
            RelationshipRefs: this.relationshipRefs.map(ref => ({
                [ref.db]: {
                    displayType: "link",
                    link: ref.link,
                    name: ref.id
                }
            })),
        };

        let json = JSON.parse(JSON.stringify(this));
        delete json.otherNames;
        delete json.publicationRefs
        delete json.unificationRefs
        delete json.relationshipRefs

        return Object.assign(genericJson, json)
    }
}

export {BiochemicalEntity}
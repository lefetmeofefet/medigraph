

// OLD
class Location {
    name;
    /**
     * @property {BioLocation}
     */
    childLocations;

    _parentLocations = [];

    constructor(name, childLocations = []) {
        this.name = name;
        this.childLocations = childLocations;
        this._parentLocations = [];
    }
}

export {Location}